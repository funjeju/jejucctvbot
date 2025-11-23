import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface LoginModalProps {
  onClose: () => void;
}

type ModalMode = 'choice' | 'signin' | 'signup';

const translations = {
  KOR: {
    title: '로그인',
    signupTitle: '회원가입',
    email: '이메일',
    password: '비밀번호',
    displayName: '이름',
    signin: '로그인',
    signup: '회원가입',
    googleSignin: 'Google로 로그인',
    or: '또는',
    toSignup: '계정이 없으신가요? 회원가입',
    toSignin: '이미 계정이 있으신가요? 로그인',
    close: '닫기',
    selectRole: '가입 유형 선택',
    roleUser: '일반 사용자',
    roleUserDesc: '피드 작성 및 쿠폰 수령',
    roleStore: '매장 운영자',
    roleStoreDesc: '사업자 번호 인증 후 쿠폰 발행 가능',
    back: '뒤로',
  },
};

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const t = translations.KOR;

  const [mode, setMode] = useState<ModalMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, displayName, selectedRole);
      onClose();
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {mode === 'choice' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <button onClick={handleGoogleSignIn} disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-medium">{t.googleSignin}</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t.or}</span>
                </div>
              </div>

              <button onClick={() => setMode('signin')}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                이메일로 로그인
              </button>

              <button onClick={() => setMode('signup')}
                className="w-full bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                이메일로 회원가입
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'signin' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMode('choice')} className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="example@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.password}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="비밀번호" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                {loading ? '로그인 중...' : t.signin}
              </button>

              <button type="button" onClick={() => setMode('signup')}
                className="w-full text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
                {t.toSignup}
              </button>
            </form>
          </div>
        )}

        {mode === 'signup' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMode('choice')} className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-800">{t.signupTitle}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t.selectRole}</label>
                <div className="space-y-2">
                  <button type="button" onClick={() => setSelectedRole('user')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedRole === 'user' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === 'user' ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {selectedRole === 'user' && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{t.roleUser}</h3>
                        <p className="text-sm text-gray-600">{t.roleUserDesc}</p>
                      </div>
                    </div>
                  </button>

                  <button type="button" onClick={() => setSelectedRole('store')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedRole === 'store' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === 'store' ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {selectedRole === 'store' && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{t.roleStore}</h3>
                        <p className="text-sm text-gray-600">{t.roleStoreDesc}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.displayName}</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="홍길동" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="example@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.password}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="6자 이상" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                {loading ? '가입 중...' : t.signup}
              </button>

              <button type="button" onClick={() => setMode('signin')}
                className="w-full text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
                {t.toSignin}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
