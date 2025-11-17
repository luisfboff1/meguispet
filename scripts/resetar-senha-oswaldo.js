/**
 * Script para resetar senha do usuário oswaldocruzjunior@gmail.com
 * Uso: node scripts/resetar-senha-oswaldo.js
 *
 * REQUISITO: O servidor deve estar rodando (pnpm dev ou pnpm dev:local)
 */

async function resetarSenha() {
  const API_URL = 'http://localhost:3000/api/usuarios/update-password'

  // Dados do usuário
  const email = 'oswaldocruzjunior@gmail.com'
  const novaSenha = '49497171'

  console.log('🔄 Buscando usuário...')

  // Primeiro, precisamos pegar o ID do usuário
  try {
    const usuariosResponse = await fetch('http://localhost:3000/api/usuarios?page=1&limit=100', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Você precisa adicionar um token de autenticação válido aqui
        // Para isso, faça login no sistema e pegue o token do localStorage
      },
    })

    const usuariosData = await usuariosResponse.json()

    if (!usuariosData.success) {
      console.error('❌ Erro ao buscar usuários:', usuariosData.message)
      console.log('\n⚠️  Este script precisa de autenticação.')
      console.log('📝 Solução: Use a interface web para editar o usuário e alterar a senha.')
      console.log('   Ou faça login no sistema e execute o script com o token.')
      return
    }

    const usuario = usuariosData.data.find(u => u.email === email)

    if (!usuario) {
      console.error('❌ Usuário não encontrado:', email)
      return
    }

    console.log('✅ Usuário encontrado:')
    console.log('   ID:', usuario.id)
    console.log('   Nome:', usuario.nome)
    console.log('   Email:', usuario.email)

    console.log('\n🔐 Atualizando senha...')

    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: usuario.id,
        new_password: novaSenha,
      }),
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Senha atualizada com sucesso!')
      console.log('\n🔑 Credenciais:')
      console.log('   Email:', email)
      console.log('   Senha:', novaSenha)
      console.log('\n✨ Agora você pode fazer login com essas credenciais!')
    } else {
      console.error('❌ Erro ao atualizar senha:', data.message)
      if (data.error) {
        console.error('   Detalhes:', data.error)
      }
    }
  } catch (error) {
    console.error('❌ Erro ao executar script:', error.message)
    console.log('\n⚠️  Certifique-se de que:')
    console.log('   1. O servidor está rodando (pnpm dev ou pnpm dev:local)')
    console.log('   2. O endpoint está acessível em http://localhost:3000')
  }
}

resetarSenha()
