import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Zap, Shield, CheckCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import fastSignLogo from "@assets/fastsign-pro-logo.png";

interface LoginFormProps {
  onLogin: (user: { email: string; name: string; role: string }) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', loginData);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: loginData.email,
          password: loginData.password
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        onLogin({
          email: userData.email,
          name: userData.name,
          role: userData.role
        });
      } else {
        const error = await response.text();
        alert('Erro no login: ' + error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Erro de conexão. Tente novamente.');
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Gestão de Documentos",
      description: "Organize e gerencie todos os seus documentos em um local seguro"
    },
    {
      icon: Zap,
      title: "Templates Inteligentes",
      description: "Gere documentos automaticamente a partir de templates personalizados"
    },
    {
      icon: Shield,
      title: "Certificado Digital",
      description: "Assinatura digital segura com validade jurídica garantida"
    },
    {
      icon: CheckCircle,
      title: "Automação Completa",
      description: "Fluxo totalmente automatizado do documento à assinatura"
    }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Features with Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400 p-12 flex-col justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
        
        <div className="relative z-10 text-white">
          {/* Main Title */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-6">FastSign Pro</h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Gere, gerencie e assine documentos com a velocidade e segurança que sua empresa precisa.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 group cursor-pointer transform transition-all duration-300 hover:translate-x-2 hover:scale-[1.02]"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-100 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-blue-100 text-sm leading-relaxed group-hover:text-white transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <img src={fastSignLogo} alt="FastSign Pro" className="w-12 h-12 rounded-lg" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">FastSign Pro</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Gestão de documentos inteligente
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Faça o Login</h2>
                <p className="text-sm text-gray-600">
                  Acesse sua conta para gerenciar documentos e assinaturas digitais
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      data-testid="input-email"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      data-testid="input-password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-1 grid place-items-center w-10 p-0 rounded-md no-default-hover-elevate no-default-active-elevate transition-none hover:bg-gray-100"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      data-testid="checkbox-remember"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-600">
                      Lembrar de mim
                    </Label>
                  </div>
                  <Button variant="ghost" className="text-sm text-blue-600 hover:text-blue-700 p-0 h-auto">
                    Esqueceu a senha?
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  data-testid="button-login"
                >
                  Entrar na Plataforma
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{" "}
                  <Button variant="ghost" className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium">
                    Solicitar acesso
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}