import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('uses Chinese device tabs and changes viewport', () => {
    const onViewportChange = vi.fn();
    render(<TopBar brandName="Design Desk" viewport="desktop" user="Huashu" reviewOpen={false} competitorOpen={false} onViewportChange={onViewportChange} onToggleReview={() => {}} onToggleCompetitors={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('Design Desk')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /手机预览/ }));
    expect(onViewportChange).toHaveBeenCalledWith('mobile');
    expect(screen.getByRole('button', { name: '电脑预览' })).toBeVisible();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('opens annotations without task or annotation counters and logs out', () => {
    const onToggleReview = vi.fn();
    const onLogout = vi.fn();
    render(<TopBar brandName="Design Desk" viewport="tablet" user="客户" reviewOpen competitorOpen={false} onViewportChange={() => {}} onToggleReview={onToggleReview} onToggleCompetitors={() => {}} onLogout={onLogout} />);
    const reviewButton = screen.getByRole('button', { name: '批注' });
    expect(reviewButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(reviewButton);
    fireEvent.click(screen.getByTitle('客户 · 点击退出'));
    expect(onToggleReview).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByText('待办')).not.toBeInTheDocument();
  });

  it('opens an optional standalone website preview without coupling the workbench to a project', () => {
    render(<TopBar brandName="Design Desk" viewport="desktop" user="Reviewer" reviewOpen={false} competitorOpen={false} previewUrl="https://preview.example.test" onViewportChange={() => {}} onToggleReview={() => {}} onToggleCompetitors={() => {}} onLogout={() => {}} />);
    const previewLink = screen.getByRole('link', { name: '在新标签页打开网站预发布效果' });
    expect(previewLink).toHaveAttribute('href', 'https://preview.example.test');
    expect(previewLink).toHaveAttribute('target', '_blank');
    expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens the optional competitor tracker from beside the project name', () => {
    const onToggleCompetitors = vi.fn();
    render(<TopBar brandName="Project Desk" viewport="desktop" user="Reviewer" reviewOpen={false} competitorOpen competitorCount={22} onViewportChange={() => {}} onToggleReview={() => {}} onToggleCompetitors={onToggleCompetitors} onLogout={() => {}} />);
    expect(screen.getByText('Project Desk')).toBeVisible();
    const button = screen.getByRole('button', { name: /竞品追踪/ });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('22 个竞品')).toBeVisible();
    fireEvent.click(button);
    expect(onToggleCompetitors).toHaveBeenCalledOnce();
  });
});
