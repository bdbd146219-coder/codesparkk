import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import i18n from '@/i18n';
import type { AdminInterestLead } from '@/lib/api/admin/interests';
import { InterestLeadsView } from '../InterestLeadsPage';

function lead(
  overrides: Partial<AdminInterestLead> & Pick<AdminInterestLead, 'id'>,
): AdminInterestLead {
  return {
    sourceType: 'course',
    sourceSlug: 'python-adventures',
    sourceTitle: 'Python Adventures',
    parentName: 'Sara Ahmed',
    phone: '+20 100 000 0000',
    email: null,
    childAge: null,
    preferredLanguage: 'en',
    notes: null,
    status: 'new',
    createdAtUtc: '2026-07-12T09:30:00Z',
    updatedAtUtc: '2026-07-12T09:30:00Z',
    contactedAtUtc: null,
    archivedAtUtc: null,
    adminNotes: null,
    ...overrides,
  };
}

function renderView(props: Partial<Parameters<typeof InterestLeadsView>[0]> = {}) {
  const onStatusChange = vi.fn();
  const onPageChange = vi.fn();
  const onSetStatus = vi.fn();
  render(
    <InterestLeadsView
      status="all"
      onStatusChange={onStatusChange}
      page={1}
      totalPages={1}
      onPageChange={onPageChange}
      viewState="data"
      leads={[lead({ id: 'l1' })]}
      busy={false}
      onSetStatus={onSetStatus}
      {...props}
    />,
  );
  return { onStatusChange, onPageChange, onSetStatus };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InterestLeadsView', () => {
  it('switches the status filter via the toolbar', () => {
    const { onStatusChange } = renderView();
    fireEvent.click(screen.getByRole('button', { name: /^contacted$/i }));
    expect(onStatusChange).toHaveBeenCalledWith('contacted');
  });

  it('marks a lead contacted without touching the staff note', () => {
    const { onSetStatus } = renderView();
    fireEvent.click(screen.getByRole('button', { name: /mark contacted/i }));
    expect(onSetStatus).toHaveBeenCalledWith('l1', 'contacted', undefined);
  });

  it('lets staff add a private note and saves it against the current status', () => {
    const { onSetStatus } = renderView();
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    fireEvent.change(screen.getByLabelText(/staff note/i), {
      target: { value: '  Called the parent  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));
    // status is unchanged ('new'), note is trimmed.
    expect(onSetStatus).toHaveBeenCalledWith('l1', 'new', 'Called the parent');
  });

  it('exports the current page as a CSV download', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    let captured: Blob | undefined;
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation((blob: Blob) => {
      captured = blob;
      return 'blob:mock';
    });

    renderView({ leads: [lead({ id: 'l1', parentName: 'Sara Ahmed' })] });
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(captured?.type).toContain('text/csv');
  });

  it('disables export when there are no rows to export', () => {
    renderView({ viewState: 'empty', leads: [] });
    const exportButton = screen.getByRole('button', { name: /export csv/i }) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(true);
  });

  it('shows the pager only when there is more than one page', () => {
    const { rerender } = renderPager(1);
    expect(screen.queryByRole('navigation', { name: /interest leads pages/i })).toBeNull();
    rerender(3);
    expect(screen.getByRole('navigation', { name: /interest leads pages/i })).toBeTruthy();
  });

  it('renders the existing staff note with an edit affordance', () => {
    renderView({ leads: [lead({ id: 'l1', adminNotes: 'Following up Monday.' })] });
    const card = screen.getByText('Following up Monday.').closest('li') as HTMLElement;
    expect(within(card).getByRole('button', { name: /edit note/i })).toBeTruthy();
  });
});

function renderPager(totalPages: number) {
  const onPageChange = vi.fn();
  const utils = render(
    <InterestLeadsView
      status="all"
      onStatusChange={vi.fn()}
      page={1}
      totalPages={totalPages}
      onPageChange={onPageChange}
      viewState="data"
      leads={[lead({ id: 'l1' })]}
      busy={false}
      onSetStatus={vi.fn()}
    />,
  );
  return {
    rerender: (next: number) =>
      utils.rerender(
        <InterestLeadsView
          status="all"
          onStatusChange={vi.fn()}
          page={1}
          totalPages={next}
          onPageChange={onPageChange}
          viewState="data"
          leads={[lead({ id: 'l1' })]}
          busy={false}
          onSetStatus={vi.fn()}
        />,
      ),
  };
}
