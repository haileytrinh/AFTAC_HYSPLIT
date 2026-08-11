import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import Scrubber from '../lib/Scrubber.svelte'; 
import { timestamp } from '../lib/state.svelte';

describe('Scrubber component', () => {
  beforeEach(() => {
    timestamp.times = [
      '2026-04-01 00:00',
      '2026-04-01 01:00',
      '2026-04-01 02:00'
    ];
    timestamp.index = 0;
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('shows the first timestamp on mount', () => {
    render(Scrubber);

    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('0');
  });

  it('moves to the next timestamp when next is clicked', async () => {
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('next'));

    expect(timestamp.index).toBe(1);
    expect(screen.getByText('2026-04-01 01:00')).toBeInTheDocument();
  });

  it('moves to the previous timestamp when previous is clicked', async () => {
    timestamp.index = 1;
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('next'));
    await fireEvent.click(screen.getByTitle('previous'));

    expect(timestamp.index).toBe(0);
    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();
  });

  it('does not move below index 0', async () => {
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('previous'));

    expect(timestamp.index).toBe(0);
    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();
  });

  it('does not move past the last timestamp', async () => {
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('next'));
    await fireEvent.click(screen.getByTitle('next'));
    await fireEvent.click(screen.getByTitle('next'));

    expect(timestamp.index).toBe(2);
    expect(screen.getByText('2026-04-01 02:00')).toBeInTheDocument();
    });

  it('updates the displayed time when the slider moves', async () => {
    render(Scrubber);

    const slider = screen.getByRole('slider');
    await fireEvent.input(slider, { target: { value: '2' } });

    expect(timestamp.index).toBe(2);
    expect(screen.getByText('2026-04-01 02:00')).toBeInTheDocument();
  });

  it('plays through timestamps over time', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));

    expect(timestamp.index).toBe(0);

    await vi.advanceTimersByTimeAsync(500);
    expect(timestamp.index).toBe(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(timestamp.index).toBe(2);
    expect(screen.getByText('2026-04-01 02:00')).toBeInTheDocument();
  });

  it('pauses playback', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));
    await vi.advanceTimersByTimeAsync(500);

    expect(timestamp.index).toBe(1);

    await fireEvent.click(screen.getByTitle('pause'));
    await vi.advanceTimersByTimeAsync(2000);

    expect(timestamp.index).toBe(1);
  });

  it('resets to the beginning if play is clicked while already at the end', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    const slider = screen.getByRole('slider');
    await fireEvent.input(slider, { target: { value: '2' } });
    expect(timestamp.index).toBe(2);

    await fireEvent.click(screen.getByTitle('play'));

    expect(timestamp.index).toBe(0);
    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(500);
    expect(timestamp.index).toBe(1);
  });


  it('changes playback speed', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    const select = screen.getByTitle('playback speed');
    await fireEvent.change(select, { target: { value: '250' } });

    await fireEvent.click(screen.getByTitle('play'));

    await vi.advanceTimersByTimeAsync(250);
    expect(timestamp.index).toBe(1);
  });

  it('does not stay playing when there is only one timestamp', async () => {
    vi.useFakeTimers();
    timestamp.times = ['2026-04-01 00:00'];
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));

    expect(timestamp.index).toBe(0);
    expect(screen.getByTitle('play')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamp.index).toBe(0);
  });

  it('clicking the play button again pauses playback', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));
    expect(screen.getByTitle('pause')).toBeInTheDocument();

    await fireEvent.click(screen.getByTitle('pause'));
    expect(screen.getByTitle('play')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamp.index).toBe(0);
  });

  it('restarts playback at the new speed when speed changes during playback', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));
    await vi.advanceTimersByTimeAsync(500);
    expect(timestamp.index).toBe(1);

    const select = screen.getByTitle('playback speed');
    await fireEvent.change(select, { target: { value: '250' } });

    await vi.advanceTimersByTimeAsync(250);
    expect(timestamp.index).toBe(2);
  });

  it('loops back to the beginning when it reaches the end during playback', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));
    await fireEvent.click(screen.getByTitle('loop'));
    await vi.advanceTimersByTimeAsync(1500);

    expect(timestamp.index).toBe(0);
    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();
  });

  it('loop continues after pause and play', async () => {
    vi.useFakeTimers();
    render(Scrubber);

    await fireEvent.click(screen.getByTitle('play'));
    await vi.advanceTimersByTimeAsync(500);
    await fireEvent.click(screen.getByTitle('pause'));

    await fireEvent.click(screen.getByTitle('loop'));
    await vi.advanceTimersByTimeAsync(1000);

    expect(timestamp.index).toBe(0);
    expect(screen.getByText('2026-04-01 00:00')).toBeInTheDocument();
  });
});