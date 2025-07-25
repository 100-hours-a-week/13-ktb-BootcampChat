import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, CloseOutlineIcon } from '@vapor-ui/icons';
import { Button, Text, Callout, IconButton } from '@vapor-ui/core';
import authService from '../services/authService';
import PersistentAvatar from './common/PersistentAvatar';

const ProfileImageUpload = ({ currentImage, onImageChange }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    setPreviewUrl(currentImage || '');
  }, [currentImage]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
      }

      setUploading(true);
      setError('');

      const filename = `${Date.now()}_${file.name}`;
      const uploadUrl = `${process.env.NEXT_PUBLIC_S3_BASE_URL}${filename}`;

      // 실제 업로드
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!res.ok) throw new Error('S3 업로드 실패');

      const imageUrl = uploadUrl.split('?')[0]; 

      setPreviewUrl(imageUrl);
      onImageChange(imageUrl);

      // 로컬 사용자 정보 업데이트
      const updatedUser = { ...currentUser, profileImage: imageUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    onImageChange('');

    const updatedUser = { ...currentUser, profileImage: '' };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('userProfileUpdate'));
  };

  return (
    <div>
      <PersistentAvatar
        key={previewUrl}
        user={{ ...currentUser, profileImage: previewUrl }}
        size="xl"
        className="mx-auto mb-2"
        showInitials={true}
      />

      <div className="mt-2 flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="sm"
        >
          <CameraIcon size={16} />
          <span className="ml-2">이미지 변경</span>
        </Button>

        {previewUrl && (
          <IconButton
            variant="outline"
            color="danger"
            onClick={handleRemoveImage}
            disabled={uploading}
            size="sm"
          >
            <CloseOutlineIcon size={16} />
          </IconButton>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {error && (
        <div className="w-full max-w-sm mx-auto mt-2">
          <Callout color="danger">{error}</Callout>
        </div>
      )}

      {uploading && (
        <Text typography="body3" color="neutral-weak" className="text-center mt-2">
          이미지 업로드 중...
        </Text>
      )}
    </div>
  );
};

export default ProfileImageUpload;

