import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AvatarPicker from './AvatarPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const baseProps = {
  user: { id: 'user-1', avatar_source: 'NONE', avatar_preset_id: null, updated_at: '2026-07-29' },
  presets: [
    { id: 1, image_url: '/api/v1/avatar-presets/1/image' },
    { id: 2, image_url: '/api/v1/avatar-presets/2/image' },
  ],
  uploads: [],
  isLoadingOptions: false,
  isSettingPreset: false,
  isUploading: false,
  isRemoving: false,
  onSelectPreset: vi.fn(),
  onUpload: vi.fn(),
  onActivateUpload: vi.fn(),
  onRemove: vi.fn(),
};

describe('AvatarPicker', () => {
  it('shows a loading state while options are loading', () => {
    render(<AvatarPicker {...baseProps} isLoadingOptions={true} />);
    expect(screen.queryByRole('button', { name: /uploadButton/i })).not.toBeInTheDocument();
  });

  it('renders all presets and lets the user pick one', () => {
    const onSelectPreset = vi.fn();
    render(<AvatarPicker {...baseProps} onSelectPreset={onSelectPreset} />);

    const presetButtons = screen.getAllByRole('button').filter((b) => b.querySelector('img'));
    expect(presetButtons).toHaveLength(2);

    fireEvent.click(presetButtons[1]);
    expect(onSelectPreset).toHaveBeenCalledWith(2);
  });

  it('does not show the remove button when there is no active avatar', () => {
    render(<AvatarPicker {...baseProps} />);
    expect(screen.queryByText('edit.avatar.remove')).not.toBeInTheDocument();
  });

  it('shows the remove button when the user has an active avatar', () => {
    render(
      <AvatarPicker
        {...baseProps}
        user={{ ...baseProps.user, avatar_source: 'PRESET', avatar_preset_id: 1 }}
      />,
    );
    expect(screen.getByText('edit.avatar.remove')).toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <AvatarPicker
        {...baseProps}
        user={{ ...baseProps.user, avatar_source: 'PRESET', avatar_preset_id: 1 }}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByText('edit.avatar.remove'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('renders the upload history and lets the user reactivate a photo', () => {
    const onActivateUpload = vi.fn();
    const uploads = [
      { id: 'upload-1', created_at: '2026-07-01', is_active: false, image_url: '/api/v1/users/me/avatar/uploads/upload-1/image' },
    ];
    render(<AvatarPicker {...baseProps} uploads={uploads} onActivateUpload={onActivateUpload} />);

    expect(screen.getByText('edit.avatar.historyLabel')).toBeInTheDocument();
    const historyButton = screen.getAllByRole('button').find((b) => b.querySelector('img[src*="upload-1"]'));
    fireEvent.click(historyButton);
    expect(onActivateUpload).toHaveBeenCalledWith('upload-1');
  });

  it('triggers the hidden file input when clicking the upload button', () => {
    render(<AvatarPicker {...baseProps} />);
    const uploadButton = screen.getByText('edit.avatar.uploadButton');
    const fileInput = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(uploadButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onUpload when a file is selected', () => {
    const onUpload = vi.fn();
    render(<AvatarPicker {...baseProps} onUpload={onUpload} />);
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
