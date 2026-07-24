import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { InterestDialog } from '../InterestDialog';

vi.mock('@/lib/api/catalog-interest', () => ({ submitCatalogInterest: vi.fn() }));
import { submitCatalogInterest } from '@/lib/api/catalog-interest';

const submitMock = vi.mocked(submitCatalogInterest);

function renderDialog(sourceType: 'course' | 'learningPath' = 'course') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <InterestDialog
        open
        onOpenChange={() => undefined}
        sourceType={sourceType}
        sourceSlug="python-first-steps"
        sourceTitle="Python First Steps"
      />
    </QueryClientProvider>,
  );
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InterestDialog', () => {
  it('renders honest, pre-commerce copy (no enrolled/paid/seat claims)', () => {
    renderDialog();
    expect(screen.getByText(/interested in this course/i)).toBeTruthy();
    const disclaimer = screen.getByText(/does not enrol your child/i).textContent ?? '';
    expect(disclaimer.toLowerCase()).not.toContain('enrolled');
    expect(disclaimer.toLowerCase()).not.toContain('payment complete');
    // Required fields present + accessible.
    expect(screen.getByLabelText(/parent \/ guardian name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^phone/i)).toBeTruthy();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('validates required fields before calling the API', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() =>
      expect(screen.getByText(/enter the parent or guardian name/i)).toBeTruthy(),
    );
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('submits a valid course lead and shows the safe success copy', async () => {
    submitMock.mockResolvedValue({ id: 'g', status: 'new', createdAtUtc: '2026-01-01T00:00:00Z' });
    renderDialog();

    fill(/parent \/ guardian name/i, 'Ali Ahmed');
    fill(/^phone/i, '+20 100 000 0000');
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(screen.getByText(/interest was received/i)).toBeTruthy());
    // Honest success note: enrollment not open, no booking/payment.
    expect(screen.getByText(/enrollment isn't open yet/i)).toBeTruthy();

    expect(submitMock).toHaveBeenCalledTimes(1);
    const body = submitMock.mock.calls[0]![0];
    expect(body).toMatchObject({
      sourceType: 'course',
      sourceSlug: 'python-first-steps',
      parentName: 'Ali Ahmed',
      preferredLanguage: 'en',
    });
    // Optional fields collapse to null, never '' or NaN.
    expect(body.email).toBeNull();
    expect(body.childAge).toBeNull();
  });

  it('shows safe error copy on API failure and never leaks the raw body', async () => {
    submitMock.mockRejectedValue(
      new ApiError(
        500,
        'https://codesparkkids.dev/errors/internal',
        'errors.server',
        'STACKTRACE at Db.Save()',
      ),
    );
    renderDialog();

    fill(/parent \/ guardian name/i, 'Sara');
    fill(/^phone/i, '0100000000');
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.queryByText(/stacktrace/i)).toBeNull();
    // Not the success state.
    expect(screen.queryByText(/interest was received/i)).toBeNull();
  });

  it('infers Arabic preferred language and shows RTL labels', async () => {
    await i18n.changeLanguage('ar');
    submitMock.mockResolvedValue({ id: 'g', status: 'new', createdAtUtc: '2026-01-01T00:00:00Z' });
    renderDialog('learningPath');

    expect(screen.getByText(/مهتم بهذا المسار/i)).toBeTruthy();
    fill(/اسم ولي الأمر/i, 'سارة');
    fill(/رقم الهاتف/i, '0100000000');
    fireEvent.click(screen.getByRole('button', { name: /إرسال/ }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0]![0]).toMatchObject({
      sourceType: 'learningPath',
      preferredLanguage: 'ar',
    });
    await i18n.changeLanguage('en');
  });
});
