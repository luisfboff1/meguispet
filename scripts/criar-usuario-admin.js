/**
 * Script para criar usuário admin via API
 * Uso: node scripts/criar-usuario-admin.js
 */

const API_URL = 'http://localhost:3000/api/auth/signup'

const novoUsuario = {
  email: 'oswaldocruzjunior@gmail.com',
  password: '49497171',
  nome: 'Oswaldo Cruz Junior',
  role: 'admin',
  permissoes: null
}

async function criarUsuario() {
  try {
    console.log('🔄 Criando usuário admin via API...')
    console.log('Email:', novoUsuario.email)
    console.log('Role:', novoUsuario.role)

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(novoUsuario),
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Usuário criado com sucesso!')
      console.log('User ID:', data.data.user.id)
      console.log('Auth User ID:', data.data.auth_user_id)
      console.log('\n🔑 Credenciais:')
      console.log('Email:', novoUsuario.email)
      console.log('Senha:', novoUsuario.password)
    } else {
      console.error('❌ Erro:', data.message)
      if (data.error) {
        console.error('Detalhes:', data.error)
      }
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message)
  }
}

criarUsuario()
