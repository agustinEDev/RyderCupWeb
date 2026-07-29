import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HandicapInputPanel from './HandicapInputPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const renderPanel = (props = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <HandicapInputPanel value={null} label="Jane Doe" onConfirm={onConfirm} onClose={onClose} {...props} />
  );
  const panel = screen.getByRole('dialog', { name: props.label ?? 'Jane Doe' });
  return { ...utils, panel, onConfirm, onClose };
};

// Scoped to the `button` role so a typed digit that happens to match the
// current display text (e.g. typing "1" when the display already reads "1")
// doesn't create an ambiguous getByText match against the display itself.
const clickKeys = (panel, keys) => {
  keys.forEach((key) => fireEvent.click(within(panel).getByRole('button', { name: key })));
};

describe('HandicapInputPanel', () => {
  it('should show a placeholder and a disabled confirm affordance when starting empty', () => {
    const { panel } = renderPanel();

    expect(within(panel).getByText('create.handicapPanel.placeholder')).toBeInTheDocument();
    expect(within(panel).getByTestId('handicap-panel-backspace')).toBeDisabled();
  });

  it('should pre-fill the display with the current value', () => {
    const { panel } = renderPanel({ value: 12.5 });

    expect(within(panel).getByTestId('handicap-panel-display')).toHaveTextContent('12.5');
  });

  it('should build up a decimal value digit by digit and confirm it', () => {
    const { panel, onConfirm } = renderPanel();

    clickKeys(panel, ['1', '6', '.', '4']);
    expect(within(panel).getByTestId('handicap-panel-display')).toHaveTextContent('16.4');

    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));
    expect(onConfirm).toHaveBeenCalledWith(16.4);
  });

  it('should confirm null when confirming an empty value', () => {
    const { panel, onConfirm } = renderPanel({ value: 10 });

    // Clear the pre-filled "10" via backspace before confirming empty
    fireEvent.click(within(panel).getByTestId('handicap-panel-backspace'));
    fireEvent.click(within(panel).getByTestId('handicap-panel-backspace'));
    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));

    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('should toggle the sign to build a negative (plus-handicap) value', () => {
    const { panel, onConfirm } = renderPanel();

    clickKeys(panel, ['2']);
    fireEvent.click(within(panel).getByLabelText('create.handicapPanel.toggleSign'));
    expect(within(panel).getByTestId('handicap-panel-display')).toHaveTextContent('-2');

    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));
    expect(onConfirm).toHaveBeenCalledWith(-2);
  });

  it('should not allow a second decimal point', () => {
    const { panel } = renderPanel();

    // The second "." is a no-op; "3" is then blocked too (only 1 decimal digit allowed)
    clickKeys(panel, ['1', '.', '2', '.', '3']);
    expect(within(panel).getByTestId('handicap-panel-display')).toHaveTextContent('1.2');
  });

  it('should not allow more than one decimal digit', () => {
    const { panel } = renderPanel();

    clickKeys(panel, ['1', '.', '2', '3']);
    expect(within(panel).getByTestId('handicap-panel-display')).toHaveTextContent('1.2');
  });

  it('should show a range error and disable confirm above the max', () => {
    const { panel, onConfirm } = renderPanel();

    clickKeys(panel, ['6', '0']);
    expect(within(panel).getByText('create.handicapPanel.errorRange')).toBeInTheDocument();
    expect(within(panel).getByTestId('handicap-panel-confirm')).toBeDisabled();

    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should show a range error and disable confirm below the min', () => {
    const { panel } = renderPanel();

    clickKeys(panel, ['1', '1']);
    fireEvent.click(within(panel).getByLabelText('create.handicapPanel.toggleSign'));
    expect(within(panel).getByText('create.handicapPanel.errorRange')).toBeInTheDocument();
    expect(within(panel).getByTestId('handicap-panel-confirm')).toBeDisabled();
  });

  it('should call onClose when clicking the backdrop or the close button', () => {
    const { panel, onClose } = renderPanel();

    fireEvent.click(within(panel).getByLabelText('create.handicapPanel.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
