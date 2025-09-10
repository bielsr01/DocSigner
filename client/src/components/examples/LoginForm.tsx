import { LoginForm } from '../login-form';

export default function LoginFormExample() {
  const handleLogin = (user: { email: string; name: string; role: string }) => {
    console.log('User logged in:', user);
    alert(`Bem-vindo, ${user.name}!`);
  };

  return <LoginForm onLogin={handleLogin} />;
}