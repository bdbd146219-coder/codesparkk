import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { MediaUploadField } from '../MediaUploadField';

vi.mock('@/lib/api/admin/media', () => ({ uploadCatalogMedia: vi.fn() }));
import { uploadCatalogMedia } from '@/lib/api/admin/media';

const uploadMock = vi.mocked(uploadCatalogMedia);

function Harness({ initialKey = '' }: { initialKey?: string }) {
  const form = useForm({ defaultValues: { thumbnailKey: initialKey, slug: 'python-adventures' } });
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <FormProvider {...form}>
        <MediaUploadField
          kind="course-thumbnail"
          keyField="thumbnailKey"
          contextField="slug"
          labelKey="staff.catalog.media.thumbnailLabel"
          previewKind="course"
        />
        <output data-testid="key-value">{form.watch('thumbnailKey')}</output>
      </FormProvider>
    </QueryClientProvider>
  );
}

function fileInput(): HTMLInputElement {
  return screen.getByLabelText('Thumbnail image') as HTMLInputElement;
}

function pngFile(name = 'thumb.png', type = 'image/png', size?: number) {
  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MediaUploadField', () => {
  it('renders the branded fallback (no <img>) and an Upload action when empty', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.catalog-media-fallback')).toBeTruthy();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeTruthy();
    expect(screen.getByText(/png, jpeg, webp or gif/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
    // The file input is present, accessible, and image-only.
    const input = fileInput();
    expect(input.getAttribute('type')).toBe('file');
    expect(input.getAttribute('accept')).toContain('image/png');
    expect(input.getAttribute('accept')).not.toContain('svg');
  });

  it('offers Replace + Remove when a key already exists', () => {
    render(<Harness initialKey="courses/python/thumb.png" />);
    expect(screen.getByRole('button', { name: /replace image/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /remove/i })).toBeTruthy();
  });

  it('uploads a file and writes the returned key into the form', async () => {
    uploadMock.mockResolvedValue({
      key: 'catalog/courses/python-adventures/thumbnail/abc123.png',
      contentType: 'image/png',
      sizeBytes: 16,
    });
    render(<Harness />);

    fireEvent.change(fileInput(), { target: { files: [pngFile()] } });

    await waitFor(() =>
      expect(screen.getByTestId('key-value').textContent).toBe(
        'catalog/courses/python-adventures/thumbnail/abc123.png',
      ),
    );
    expect(screen.getByText(/image uploaded/i)).toBeTruthy();
    expect(uploadMock).toHaveBeenCalledWith(
      expect.any(File),
      'course-thumbnail',
      'python-adventures',
    );
  });

  it('rejects a non-image file client-side without calling the API', async () => {
    render(<Harness />);
    fireEvent.change(fileInput(), {
      target: { files: [pngFile('notes.txt', 'text/plain')] },
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/choose a png, jpeg, webp, or gif/i)).toBeTruthy();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('key-value').textContent).toBe('');
  });

  it('rejects an oversize file client-side without calling the API', async () => {
    render(<Harness />);
    fireEvent.change(fileInput(), {
      target: { files: [pngFile('huge.png', 'image/png', 6 * 1024 * 1024)] },
    });
    await waitFor(() => expect(screen.getByText(/too large/i)).toBeTruthy());
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('shows a safe, localized error when the server rejects the upload', async () => {
    uploadMock.mockRejectedValue(
      new ApiError(400, 'https://x/errors/validation', 'errors.validation', undefined, {
        file: ['Unsupported image type.'],
      }),
    );
    render(<Harness />);

    fireEvent.change(fileInput(), { target: { files: [pngFile()] } });

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/couldn.t be uploaded/i)).toBeTruthy();
    // The form key is untouched on failure.
    expect(screen.getByTestId('key-value').textContent).toBe('');
  });

  it('clears the stored key when Remove is clicked', () => {
    render(<Harness initialKey="courses/python/thumb.png" />);
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(screen.getByTestId('key-value').textContent).toBe('');
    expect(screen.getByRole('button', { name: /upload image/i })).toBeTruthy();
  });
});
