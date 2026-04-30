/**
 * Frontend component tests for Generate.tsx.
 *
 * Uses Vitest + React Testing Library.
 * All external services (generatePcap, Socket.io) are mocked.
 *
 * Run: cd frontend && npm test
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Generate from '../components/Generate';

// ─── Mock generateService ─────────────────────────────────────────────────────
const mockGeneratePcap = vi.fn();
vi.mock('../services/generateService', () => ({
  generatePcap: (...args: unknown[]) => mockGeneratePcap(...args),
}));

// ─── Mock uploadService (for downloadResult) ─────────────────────────────────
vi.mock('../services/uploadService', () => ({
  downloadResult: vi.fn(),
}));

// ─── Mock react-hot-toast ─────────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Mock motion/react (simplify animations for testing) ─────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterDomProps(props)}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...filterDomProps(props)}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...filterDomProps(props)}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

/** Filter out motion-specific props that would produce React warnings */
function filterDomProps(props: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {};
  const nonDomKeys = new Set([
    'initial', 'animate', 'exit', 'transition', 'layout',
    'whileHover', 'whileTap', 'variants', 'mode',
  ]);
  for (const key of Object.keys(props)) {
    if (!nonDomKeys.has(key)) filtered[key] = props[key];
  }
  return filtered;
}

// ─── Socket Mock Factory ──────────────────────────────────────────────────────
function createMockSocket() {
  const listeners: Record<string, Function[]> = {};
  return {
    on: vi.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(fn => fn !== cb);
      }
    }),
    emit: vi.fn(),
    connected: true,
    // Helper to simulate server-side events in tests
    __simulateEvent: (event: string, data: unknown) => {
      act(() => {
        (listeners[event] || []).forEach(cb => cb(data));
      });
    },
    __listeners: listeners,
  };
}

// ─── Default Props ────────────────────────────────────────────────────────────
const mockOnPageChange = vi.fn();

function renderGenerate(socketOverride?: ReturnType<typeof createMockSocket>) {
  const socket = socketOverride || createMockSocket();
  render(<Generate socket={socket as any} onPageChange={mockOnPageChange} />);
  return socket;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Tests
// ═════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
  mockGeneratePcap.mockReset();
});

describe('Rendering Tests', () => {

  test('1. renders in idle state by default', () => {
    renderGenerate();
    expect(screen.getByText('Ready to Generate')).toBeInTheDocument();
  });

  test('2. "Ready to Generate" text visible on initial render', () => {
    renderGenerate();
    expect(screen.getByText('Ready to Generate')).toBeVisible();
  });

  test('3. all 4 protocol checkboxes render', () => {
    renderGenerate();
    expect(screen.getByText('HTTP')).toBeInTheDocument();
    expect(screen.getByText('HTTPS')).toBeInTheDocument();
    expect(screen.getByText('DNS')).toBeInTheDocument();
    expect(screen.getByText('QUIC')).toBeInTheDocument();
  });

  test('4. default domain chips render', () => {
    renderGenerate();
    expect(screen.getByText('youtube.com')).toBeInTheDocument();
    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();
  });

  test('5. packet count slider renders with default 500', () => {
    renderGenerate();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('500');
  });

  test('6. "Generate & Analyze" button is enabled', () => {
    renderGenerate();
    const button = screen.getByRole('button', { name: /Generate & Analyze/i });
    expect(button).toBeEnabled();
  });
});

describe('Form Interaction Tests', () => {

  test('7. clicking a protocol card selects it', () => {
    renderGenerate();
    const quicButton = screen.getByText('QUIC').closest('button')!;
    fireEvent.click(quicButton);
    // QUIC should now have selected styling (border-primary class)
    expect(quicButton.className).toContain('border-primary');
  });

  test('8. clicking selected protocol deselects it', () => {
    renderGenerate();
    const httpButton = screen.getByText('HTTP').closest('button')!;
    // HTTP is selected by default
    expect(httpButton.className).toContain('border-primary');
    fireEvent.click(httpButton);
    // Now it should not have the selected class
    expect(httpButton.className).not.toContain('border-primary');
  });

  test('9. deselecting all protocols shows error', () => {
    renderGenerate();
    // Deselect all three defaults: HTTP, HTTPS, DNS
    fireEvent.click(screen.getByText('HTTP').closest('button')!);
    fireEvent.click(screen.getByText('HTTPS').closest('button')!);
    fireEvent.click(screen.getByText('DNS').closest('button')!);

    expect(screen.getByText('Select at least one protocol')).toBeInTheDocument();
  });

  test('10. typing domain + Enter adds chip', async () => {
    renderGenerate();
    const input = screen.getByPlaceholderText('Type domain and press Enter');
    await userEvent.type(input, 'facebook.com');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('facebook.com')).toBeInTheDocument();
  });

  test('11. typing domain + comma adds chip', async () => {
    renderGenerate();
    const input = screen.getByPlaceholderText('Type domain and press Enter');
    await userEvent.type(input, 'test.org');
    fireEvent.keyDown(input, { key: ',' });
    expect(screen.getByText('test.org')).toBeInTheDocument();
  });

  test('12. clicking X removes chip', async () => {
    renderGenerate();
    // google.com is a default chip
    const chip = screen.getByText('google.com');
    const removeButton = chip.querySelector('button')!;
    fireEvent.click(removeButton);
    expect(screen.queryByText('google.com')).not.toBeInTheDocument();
  });

  test('13. moving slider updates packet count', () => {
    renderGenerate();
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2000' } });
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  test('14. invalid CIDR shows error on blur', async () => {
    renderGenerate();
    const ipInput = screen.getByPlaceholderText('192.168.1.0/24');
    await userEvent.clear(ipInput);
    await userEvent.type(ipInput, 'invalid');
    fireEvent.blur(ipInput);
    expect(screen.getByText(/Invalid CIDR format/)).toBeInTheDocument();
  });

  test('15. valid CIDR clears error', async () => {
    renderGenerate();
    const ipInput = screen.getByPlaceholderText('192.168.1.0/24');
    // First trigger an error
    await userEvent.clear(ipInput);
    await userEvent.type(ipInput, 'invalid');
    fireEvent.blur(ipInput);
    expect(screen.getByText(/Invalid CIDR format/)).toBeInTheDocument();
    // Now fix it
    await userEvent.clear(ipInput);
    await userEvent.type(ipInput, '10.0.0.0/8');
    fireEvent.blur(ipInput);
    expect(screen.queryByText(/Invalid CIDR format/)).not.toBeInTheDocument();
  });
});

describe('State Transition Tests', () => {

  test('16. clicking Generate calls generatePcap with correct params', async () => {
    mockGeneratePcap.mockResolvedValue({ jobId: 'gen_123', filename: 'test.pcap' });
    renderGenerate();

    const button = screen.getByRole('button', { name: /Generate & Analyze/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGeneratePcap).toHaveBeenCalledWith({
        packetCount: 500,
        protocols: ['http', 'https', 'dns'],
        domains: ['youtube.com', 'google.com', 'github.com'],
        ipRange: '192.168.1.0/24',
      });
    });
  });

  test('17. during generation: button shows spinner and is disabled', async () => {
    // Never resolve to keep in generating state
    mockGeneratePcap.mockReturnValue(new Promise(() => {}));
    renderGenerate();

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    // The button with the spinner should be disabled
    const buttons = screen.getAllByRole('button');
    const genButton = buttons.find(b => b.textContent?.includes('Generating...'));
    expect(genButton).toBeDisabled();
  });

  test('18. during generation: right panel shows progress', async () => {
    mockGeneratePcap.mockReturnValue(new Promise(() => {}));
    renderGenerate();

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Initializing generator...')).toBeInTheDocument();
    });
  });

  test('19. on job:done: component transitions to complete state', async () => {
    mockGeneratePcap.mockResolvedValue({ jobId: 'gen_123', filename: 'test.pcap' });
    const socket = createMockSocket();
    render(<Generate socket={socket as any} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(mockGeneratePcap).toHaveBeenCalled();
    });

    // Simulate job:done
    socket.__simulateEvent('job:done', {
      jobId: 'gen_123',
      stats: { metrics: { forwarded: 80, dropped: 20, totalPackets: 100 } },
      outputFile: 'filtered_output.pcap',
    });

    await waitFor(() => {
      expect(screen.getByText('Generation Complete')).toBeInTheDocument();
    });
  });

  test('20. complete state shows forwarded/dropped/total', async () => {
    mockGeneratePcap.mockResolvedValue({ jobId: 'gen_123', filename: 'test.pcap' });
    const socket = createMockSocket();
    render(<Generate socket={socket as any} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => expect(mockGeneratePcap).toHaveBeenCalled());

    socket.__simulateEvent('job:done', {
      jobId: 'gen_123',
      stats: { metrics: { forwarded: 80, dropped: 20, totalPackets: 100 } },
      outputFile: 'filtered_output.pcap',
    });

    expect(await screen.findByText('80')).toBeInTheDocument();
    expect(await screen.findByText('20')).toBeInTheDocument();
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  test('21. complete state shows Download button', async () => {
    mockGeneratePcap.mockResolvedValue({ jobId: 'gen_123', filename: 'test.pcap' });
    const socket = createMockSocket();
    render(<Generate socket={socket as any} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));
    await waitFor(() => expect(mockGeneratePcap).toHaveBeenCalled());

    socket.__simulateEvent('job:done', {
      jobId: 'gen_123',
      stats: { metrics: { forwarded: 80, dropped: 20, totalPackets: 100 } },
      outputFile: 'filtered_output.pcap',
    });

    await waitFor(() => {
      expect(screen.getByText(/Download PCAP File/i)).toBeInTheDocument();
    });
  });

  test('22. clicking "Generate Another" resets to idle', async () => {
    mockGeneratePcap.mockResolvedValue({ jobId: 'gen_123', filename: 'test.pcap' });
    const socket = createMockSocket();
    render(<Generate socket={socket as any} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));
    await waitFor(() => expect(mockGeneratePcap).toHaveBeenCalled());

    socket.__simulateEvent('job:done', {
      jobId: 'gen_123',
      stats: { metrics: { forwarded: 80, dropped: 20, totalPackets: 100 } },
      outputFile: 'out.pcap',
    });

    await waitFor(() => {
      expect(screen.getByText('Generate Another')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Generate Another'));

    await waitFor(() => {
      expect(screen.getByText('Ready to Generate')).toBeInTheDocument();
    });
  });

  test('23. API error transitions to error state', async () => {
    mockGeneratePcap.mockRejectedValue(new Error('Server exploded'));
    renderGenerate();

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Server exploded')).toBeInTheDocument();
    });
  });

  test('24. error state shows "Try Again" button', async () => {
    mockGeneratePcap.mockRejectedValue(new Error('Oops'));
    renderGenerate();

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  test('25. clicking "Try Again" resets to idle', async () => {
    mockGeneratePcap.mockRejectedValue(new Error('Oops'));
    renderGenerate();

    fireEvent.click(screen.getByRole('button', { name: /Generate & Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(screen.getByText('Ready to Generate')).toBeInTheDocument();
    });
  });
});

describe('Edge Case Tests', () => {

  test('26. removing all default chips leaves empty domains', () => {
    renderGenerate();
    // Remove all 3 defaults
    ['youtube.com', 'google.com', 'github.com'].forEach(domain => {
      const chip = screen.getByText(domain);
      const removeBtn = chip.parentElement!.querySelector('button')!;
      fireEvent.click(removeBtn);
    });

    expect(screen.queryByText('youtube.com')).not.toBeInTheDocument();
    expect(screen.queryByText('google.com')).not.toBeInTheDocument();
    expect(screen.queryByText('github.com')).not.toBeInTheDocument();
  });

  test('27. adding duplicate domain does not add twice', async () => {
    renderGenerate();
    const input = screen.getByPlaceholderText('Type domain and press Enter');
    
    // youtube.com is already a default
    await userEvent.type(input, 'youtube.com');
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should still be exactly one
    const chips = screen.getAllByText('youtube.com');
    expect(chips).toHaveLength(1);
  });
});
