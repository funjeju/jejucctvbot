import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup, login } = useAuth();

  // 컴포넌트 마운트 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  if (!isOpen) return null;

  // 비밀번호 유효성 검사
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return '비밀번호는 6자 이상이어야 합니다';
    }
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    if (!hasLetter || !hasNumber) {
      return '비밀번호는 영문과 숫자를 포함해야 합니다';
    }
    return null;
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setError('');
    setSuccess('');
    setMode('login');
    onClose();
  };

  // 회원가입 핸들러
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 이메일 검증
    if (!email || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요');
      return;
    }

    // 비밀번호 검증
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // 비밀번호 확인 검증
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsSubmitting(true);

    try {
      // Firebase 회원가입 - 자동으로 인증 이메일 발송됨
      await signup(email, password);
      setSuccess('회원가입 완료! 이메일로 발송된 인증 링크를 확인해주세요.');
      setPassword('');
      setPasswordConfirm('');

      // 3초 후 로그인 모드로 전환
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Signup error:', err);

      // Firebase 에러 메시지 한글화
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('이미 사용 중인 이메일입니다');
          break;
        case 'auth/invalid-email':
          setError('잘못된 이메일 형식입니다');
          break;
        case 'auth/weak-password':
          setError('비밀번호가 너무 약합니다');
          break;
        default:
          setError(err.message || '회원가입 중 오류가 발생했습니다');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그인 핸들러
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 이메일 검증
    if (!email || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요');
      return;
    }

    // 비밀번호 검증
    if (!password) {
      setError('비밀번호를 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      // 로그인
      const userCredential = await login(email, password);

      // 이메일 인증 여부 확인
      if (!userCredential.emailVerified) {
        setError('이메일 인증이 필요합니다. 이메일을 확인해주세요.');
        setIsSubmitting(false);
        return;
      }

      // 이메일 기억하기 처리
      if (rememberEmail) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }

      setSuccess('로그인 성공!');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 500);
    } catch (err: any) {
      console.error('Login error:', err);

      // Firebase 에러 메시지 한글화
      switch (err.code) {
        case 'auth/user-not-found':
          setError('등록되지 않은 이메일입니다');
          break;
        case 'auth/wrong-password':
          setError('비밀번호가 올바르지 않습니다');
          break;
        case 'auth/too-many-requests':
          setError('너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요');
          break;
        case 'auth/invalid-credential':
          setError('이메일 또는 비밀번호가 올바르지 않습니다');
          break;
        default:
          setError(err.message || '로그인 중 오류가 발생했습니다');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 로그인 폼 */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="example@email.com"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="영문 + 숫자 조합 (6자 이상)"
                required
              />
            </div>

            {/* 이메일 기억하기 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberEmail"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-700">
                이메일 기억하기
              </label>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 성공 메시지 */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                id="signupEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="example@email.com"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="signupPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="영문 + 숫자 조합 (6자 이상)"
                required
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="signupPasswordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                type="password"
                id="signupPasswordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="비밀번호 재입력"
                required
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 성공 메시지 */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '가입 중...' : '회원가입'}
            </button>

            {/* 안내 메시지 */}
            <p className="text-xs text-gray-500 text-center">
              가입 후 이메일로 발송된 인증 링크를 클릭해주세요
            </p>
          </form>
        )}

        {/* 모드 전환 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
              setSuccess('');
              setPassword('');
              setPasswordConfirm('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
