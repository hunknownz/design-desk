import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('uses Chinese device tabs and changes viewport', () => {
    const onViewportChange = vi.fn();
    render(<TopBar viewport="desktop" user="Huashu" reviewOpen={false} onViewportChange={onViewportChange} onToggleReview={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('Design Desk')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /手机预览/ }));
    expect(onViewportChange).toHaveBeenCalledWith('mobile');
    expect(screen.getByRole('button', { name: '电脑预览' })).toBeVisible();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('opens annotations without task or annotation counters and logs out', () => {
    const onToggleReview = vi.fn();
    const onLogout = vi.fn();
    render(<TopBar viewport="tablet" user="客户" reviewOpen onViewportChange={() => {}} onToggleReview={onToggleReview} onLogout={onLogout} />);
    const reviewButton = screen.getByRole('button', { name: '批注' });
    expect(reviewButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(reviewButton);
    fireEvent.click(screen.getByTitle('客户 · 点击退出'));
    expect(onToggleReview).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByText('待办')).not.toBeInTheDocument();
  });
});
