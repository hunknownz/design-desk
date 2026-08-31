import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserBar } from './BrowserBar';

describe('BrowserBar', () => {
  it('shows the official SEO URL inside a browser-style address field and runs browser controls', () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    const onRefresh = vi.fn();
    const onToggleAnnotation = vi.fn();
    render(<BrowserBar url="https://example.test/products/" annotationMode={false} canGoBack canGoForward={false} onBack={onBack} onForward={onForward} onRefresh={onRefresh} onToggleAnnotation={onToggleAnnotation} />);
    const address = screen.getByLabelText('当前页面地址');
    expect(address).toHaveClass('browser-address');
    expect(address).toHaveTextContent('https://example.test/products/');
    expect(address).toHaveAttribute('title', 'https://example.test/products/');
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    fireEvent.click(screen.getByRole('button', { name: '刷新 Demo' }));
    fireEvent.click(screen.getByRole('button', { name: '添加批注' }));
    expect(screen.getByRole('button', { name: '前进' })).toBeDisabled();
    expect(onBack).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onToggleAnnotation).toHaveBeenCalledOnce();
  });

  it('shows annotation mode in the browser bar', () => {
    render(<BrowserBar url="https://example.test/" annotationMode canGoBack={false} canGoForward={false} onBack={() => {}} onForward={() => {}} onRefresh={() => {}} onToggleAnnotation={() => {}} />);
    expect(screen.getByRole('button', { name: '退出批注' })).toHaveAttribute('aria-pressed', 'true');
  });
});
