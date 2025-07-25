import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { ErrorCircleIcon } from '@vapor-ui/icons';
import { Button, TextInput, Card, Text, Callout, Avatar } from '@vapor-ui/core';
import { Flex, Stack, Center, Box } from '../components/ui/Layout';
import authService from '../services/authService';
import { withAuth } from '../middleware/withAuth';
import ProfileImageUpload from '../components/ProfileImageUpload';
import { generateColorFromEmail, getContrastTextColor } from '../utils/colorUtils';

const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const avatarStyleRef = useRef(null);

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = useCallback((imagePath) => {
    if (!imagePath) return null;
    return imagePath.startsWith('http') ? 
      imagePath : 
      `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }

    // 아바타 스타일과 함께 사용자 정보 설정
    if (!avatarStyleRef.current && user.email) {
      const backgroundColor = generateColorFromEmail(user.email);
      const color = getContrastTextColor(backgroundColor);
      avatarStyleRef.current = { backgroundColor, color };
    }

    setCurrentUser(user);
    setFormData(prev => ({ ...prev, name: user.name }));
    setProfileImage(user.profileImage || '');
  }, [router, getProfileImageUrl]);

  // 전역 이벤트 리스너 설정
  useEffect(() => {
    const handleProfileUpdate = () => {
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setProfileImage(user.profileImage || '');
      }
    };

    window.addEventListener('userProfileUpdate', handleProfileUpdate);
    return () => {
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
    };
  }, []);

  const handleImageChange = useCallback(async (imageUrl) => {
    try {
      setError('');
      setSuccess('');

      // 1) 백엔드에 URL 저장 요청
      const user = authService.getCurrentUser();
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image-url`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': user.token,
          'x-session-id': user.sessionId,
        },
        body: JSON.stringify({ profileImage: imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '프로필 이미지 저장에 실패했습니다.');
      }

      const { user: updatedUserData } = await response.json();

      // 2) 성공 시 로컬 업데이트
      setProfileImage(imageUrl);
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      setCurrentUser(updatedUserData);

      setSuccess('프로필 이미지가 업데이트되었습니다.');

      // 3초 후 메시지 초기화
      setTimeout(() => {
        setSuccess('');
      }, 3000);

      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (error) {
      console.error('Image update error:', error);
      setError(error.message || '프로필 이미지 업데이트에 실패했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (
      formData.name.trim() === currentUser.name.trim() && 
      !formData.currentPassword && 
      !formData.newPassword
    ) {
      setError('변경할 이름이나 비밀번호를 입력해주세요.');
      return;
    }

    const payload = {};
    if (formData.name.trim() !== currentUser.name.trim()) {
      payload.name = formData.name.trim();
    }
    if (formData.currentPassword && formData.newPassword) {
      payload.currentPassword = formData.currentPassword;
      payload.newPassword = formData.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setError('변경할 내용이 없습니다.');
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await authService.updateProfile(payload);

      setCurrentUser(updatedUser);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || err.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };


  if (!currentUser) return null;

  return (
    <div className="auth-container">
      <Card.Root className="auth-card">
        <Card.Body className="card-body">
          <Stack gap="400">
            <Center>
              <Text typography="heading3">프로필 설정</Text>
            </Center>
            
            <Center>
              <ProfileImageUpload 
                currentImage={profileImage}
                onImageChange={handleImageChange}
              />
            </Center>

          {error && (
            <Box mt="400">
              <Callout color="danger">
                <Flex align="center" gap="200">
                  <ErrorCircleIcon size={16} />
                  <Text>{error}</Text>
                </Flex>
              </Callout>
            </Box>
          )}

          {success && (
            <Box mt="400">
              <Callout color="success">
                <Text>{success}</Text>
              </Callout>
            </Box>
          )}

          <Box mt="400">
            <form onSubmit={handleSubmit}>
              <Stack gap="300">
                <Box>
                  <TextInput.Root
                    type="email"
                    value={currentUser.email}
                    disabled
                  >
                    <TextInput.Label>이메일</TextInput.Label>
                    <TextInput.Field
                      id="email"
                      name="email"
                      required
                      style={{ width: '100%' }}
                    />
                  </TextInput.Root>
                </Box>
                
                <Box>
                  <TextInput.Root
                    type="text"
                    value={formData.name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                    disabled={loading}
                  >
                    <TextInput.Label>이름</TextInput.Label>
                    <TextInput.Field
                      id="name"
                      name="name"
                      placeholder="이름을 입력하세요"
                      required
                      style={{ width: '100%' }}
                    />
                  </TextInput.Root>
                </Box>
                
                <Box>
                  <TextInput.Root
                    type="password"
                    value={formData.currentPassword}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currentPassword: value }))}
                    disabled={loading}
                  >
                    <TextInput.Label>현재 비밀번호</TextInput.Label>
                    <TextInput.Field
                      id="currentPassword"
                      name="currentPassword"
                      placeholder="현재 비밀번호를 입력하세요"
                      style={{ width: '100%' }}
                    />
                  </TextInput.Root>
                </Box>
                
                <Box>
                  <TextInput.Root
                    type="password"
                    value={formData.newPassword}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, newPassword: value }))}
                    disabled={loading}
                  >
                    <TextInput.Label>새 비밀번호</TextInput.Label>
                    <TextInput.Field
                      id="newPassword"
                      name="newPassword"
                      placeholder="새 비밀번호를 입력하세요"
                      style={{ width: '100%' }}
                    />
                  </TextInput.Root>
                </Box>
                
                <Box>
                  <TextInput.Root
                    type="password"
                    value={formData.confirmPassword}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
                    disabled={loading}
                  >
                    <TextInput.Label>새 비밀번호 확인</TextInput.Label>
                    <TextInput.Field
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="새 비밀번호를 다시 입력하세요"
                      style={{ width: '100%' }}
                    />
                  </TextInput.Root>
                </Box>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--vapor-space-300)', marginTop: 'var(--vapor-space-300)', width: '100%' }}>
                  <Button
                    type="submit"
                    color="primary"
                    size="md"
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    color="secondary"
                    size="md"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    취소
                  </Button>
                </div>
              </Stack>
            </form>
          </Box>
          </Stack>
        </Card.Body>
      </Card.Root>
    </div>
  );
};

export default withAuth(Profile);