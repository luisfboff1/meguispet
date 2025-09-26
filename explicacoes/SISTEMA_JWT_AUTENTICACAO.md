# 🔐 Sistema JWT - Autenticação MeguisPet

## 📋 Visão Geral

Este documento explica como funciona o sistema de autenticação JWT no MeguisPet, desde a geração do token até sua validação em cada API.

## 🏗️ Arquitetura do Sistema

### Estrutura de Arquivos
```
api/
├── auth.php          # Gera tokens (login)
├── config.php        # Configurações do banco
├── jwt_helper.php    # Funções JWT (gerar/validar)
├── produtos.php      # Valida tokens (CRUD)
├── clientes.php      # Valida tokens (CRUD)
├── vendas.php        # Valida tokens (CRUD)
└── dashboard/        # APIs do dashboard
```

## 🔄 Fluxo de Autenticação

### 1. **Login (Geração do Token)**
```php
// auth.php - linha 54
$token = generate_jwt([
    'id' => $user['id'],
    'email' => $user['email'],
    'role' => $user['role']
]);
```

**O que acontece:**
- Usuário faz login
- `auth.php` valida credenciais
- Gera token JWT com dados do usuário
- Retorna token para o frontend

### 2. **Armazenamento no Frontend**
```javascript
// login.tsx
fetch('/api/auth.php', { ... })
.then(r => r.json())
.then(data => {
  localStorage.setItem('token', data.data.token);  // ← Salva no navegador
  localStorage.setItem('user', JSON.stringify(data.data.user));
});
```

**Onde fica salvo:**
- **localStorage** do navegador
- Persiste entre sessões
- Acessível apenas pelo domínio

### 3. **Validação em Cada API**
```php
// produtos.php, clientes.php, etc. - linha 8
$auth = require_auth();  // ← Valida token automaticamente
```

**O que acontece:**
- Frontend envia token no header `Authorization: Bearer token`
- API chama `require_auth()`
- Valida token e retorna dados do usuário
- Se inválido, retorna erro 401

## 🔧 Funções JWT

### **Geração (`generate_jwt`)**
```php
// jwt_helper.php
function generate_jwt($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($payload);
    
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64Header . "." . $base64Payload . "." . $base64Signature;
}
```

### **Validação (`validate_jwt`)**
```php
// jwt_helper.php
function validate_jwt($token) {
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return false;
    }
    
    list($base64Header, $base64Payload, $base64Signature) = $parts;
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
    $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (!hash_equals($expectedSignature, $base64Signature)) {
        return false;
    }
    
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);
    
    // Verificar se o token não expirou
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}
```

## 🎯 Responsabilidades por Arquivo

### **`auth.php` - GERAÇÃO**
- ✅ **Só gera** tokens (nunca valida)
- ❌ **Nunca valida** tokens
- **Responsabilidade**: Porta de entrada do sistema

### **Outros APIs - VALIDAÇÃO**
- ❌ **Nunca geram** tokens
- ✅ **Sempre validam** tokens
- **Responsabilidade**: Proteger acesso às funcionalidades

## 🔍 Como o Sistema "Sabe" o que Fazer

### **Por Contexto (onde está sendo chamado):**

**`auth.php`:**
```php
$token = generate_jwt([...]);  // ← SEMPRE gera
```

**Outros APIs:**
```php
$auth = require_auth();  // ← SEMPRE valida
```

### **Por Design:**
- **auth.php** = "Eu só crio chaves, não verifico"
- **Outros APIs** = "Eu só verifico chaves, não crio"

## 🚀 Fluxo Completo

```
1. Login → auth.php → generate_jwt() → Retorna token
2. Frontend → localStorage.setItem('token', token) → Salva no navegador
3. Acesso produtos → Frontend → Header "Authorization: Bearer token"
4. produtos.php → require_auth() → validate_jwt() → Permite acesso
```

## 🔐 Segurança

### **Token JWT Contém:**
- **Header**: Tipo e algoritmo
- **Payload**: Dados do usuário + expiração
- **Signature**: Assinatura para validação

### **Validações:**
- ✅ **Assinatura** válida
- ✅ **Token** não expirado
- ✅ **Formato** correto
- ✅ **Header Authorization** presente

## 🛠️ Troubleshooting

### **Erro 401 - Token Inválido**
```javascript
// Verificar se token existe
console.log('Token:', localStorage.getItem('token'));

// Fazer login novamente
fetch('/api/auth.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'seu@email.com', password: 'sua_senha' })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    localStorage.setItem('token', data.data.token);
    console.log('✅ Login realizado!');
  }
});
```

### **Erro 500 - Problema no Servidor**
- Verificar se `jwt_helper.php` está sendo carregado
- Verificar se `JWT_SECRET` está definido
- Verificar logs do servidor

## 📝 Resumo

O sistema JWT do MeguisPet funciona como um **"passe de entrada"**:

1. **Login** → Gera o passe (token)
2. **Frontend** → Guarda o passe (localStorage)
3. **Cada API** → Verifica o passe (validação)
4. **Acesso** → Permite ou nega baseado no passe

**Cada arquivo tem sua responsabilidade bem definida e o sistema funciona de forma automática!** 🎫
