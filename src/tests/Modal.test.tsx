import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../components/ui/Modal.js';

describe('Modal Component (WCAG 2.1 AA Compliant)', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Dialog">
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with ARIA attributes and title when isOpen is true', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Emergency Credentials"
        description="Single-use induction PIN"
      >
        <div>Modal Body Content</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    expect(screen.getByText('Emergency Credentials')).toBeInTheDocument();
    expect(screen.getByText('Single-use induction PIN')).toBeInTheDocument();
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
  });

  it('invokes onClose when clicking the close button or backdrop', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Dismiss Test">
        <div>Body</div>
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/close modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <div>Body</div>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus inside the modal when pressing Tab', async () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Focus Trap Test"
        showFooter
        confirmLabel="SUBMIT"
        onConfirm={() => {}}
      >
        <input data-testid="test-input" placeholder="Enter text" />
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/close modal/i);
    const confirmBtn = screen.getByRole('button', { name: 'SUBMIT' });

    // First focusable element gets focused
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Press Shift+Tab on the first element (closeBtn) -> should loop to last element (confirmBtn)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);

    // Press Tab on the last element (confirmBtn) -> should cycle to first element (closeBtn)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('excludes hidden inputs from focus trap so focus does not escape dialog', async () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Hidden Input Focus Trap Test"
        showFooter
        confirmLabel="SUBMIT"
        onConfirm={() => {}}
      >
        <div>
          <input type="text" placeholder="Visible input" data-testid="visible-input" />
          <input type="hidden" name="csrfToken" value="sec-tok-123" data-testid="hidden-csrf" />
        </div>
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/close modal/i);
    const confirmBtn = screen.getByRole('button', { name: 'SUBMIT' });

    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Press Shift+Tab on closeBtn -> must wrap to confirmBtn (not the hidden input)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);

    // Press Tab on confirmBtn -> must wrap back to closeBtn
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('renders close button with minimum 44x44px touch target hitbox (WCAG SC 2.5.8)', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Touch Target Test">
        <div>Content</div>
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/close modal/i);
    expect(closeBtn.className).toContain('min-w-[44px]');
    expect(closeBtn.className).toContain('min-h-[44px]');
  });
});
