# 🗄️ Instruções para MariaDB/MySQL

## ⚠️ **IMPORTANTE**: Você está usando MariaDB, não PostgreSQL!

Os scripts originais eram para PostgreSQL. Agora corrigi tudo para MariaDB/MySQL.

## 📋 **Scripts Corretos para Executar:**

### 1. **Primeiro**: Execute as tabelas de movimentações
```sql
-- Execute este arquivo:
database/movimentacoes_tables_mariadb.sql
```

### 2. **Segundo**: Execute a atualização de produtos
```sql
-- Execute este arquivo:
database/update_produtos_preco_medio_mariadb.sql
```

## 🔧 **Principais Diferenças Corrigidas:**

### **PostgreSQL → MariaDB/MySQL:**

1. **Sintaxe de Funções:**
   ```sql
   -- PostgreSQL (❌ não funciona no MariaDB)
   CREATE FUNCTION nome() RETURNS tipo AS $$ ... $$ LANGUAGE plpgsql;
   
   -- MariaDB (✅ correto)
   DELIMITER $$
   CREATE FUNCTION nome() RETURNS tipo ... END$$
   DELIMITER ;
   ```

2. **Stored Procedures:**
   ```sql
   -- PostgreSQL (❌ não funciona no MariaDB)
   SELECT funcao($1, $2, $3);
   
   -- MariaDB (✅ correto)
   CALL procedure(?, ?, ?);
   ```

3. **Tipos de Dados:**
   ```sql
   -- PostgreSQL
   SERIAL, VARCHAR(20), DECIMAL(10,2)
   
   -- MariaDB
   INT AUTO_INCREMENT, VARCHAR(20), DECIMAL(10,2)
   ```

4. **ENUMs:**
   ```sql
   -- PostgreSQL
   tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'saida', 'ajuste'))
   
   -- MariaDB
   tipo ENUM('entrada', 'saida', 'ajuste')
   ```

## 🚀 **Como Executar:**

### **Opção 1: Via phpMyAdmin**
1. Acesse phpMyAdmin
2. Selecione seu banco de dados
3. Vá em "SQL"
4. Cole o conteúdo de `movimentacoes_tables_mariadb.sql`
5. Execute
6. Cole o conteúdo de `update_produtos_preco_medio_mariadb.sql`
7. Execute

### **Opção 2: Via Linha de Comando**
```bash
mysql -u seu_usuario -p seu_banco < database/movimentacoes_tables_mariadb.sql
mysql -u seu_usuario -p seu_banco < database/update_produtos_preco_medio_mariadb.sql
```

### **Opção 3: Via Cliente MySQL**
```sql
-- Conecte ao seu banco e execute:
SOURCE database/movimentacoes_tables_mariadb.sql;
SOURCE database/update_produtos_preco_medio_mariadb.sql;
```

## 📁 **Arquivos Corrigidos:**

### **APIs Atualizadas:**
- ✅ `api/movimentacoes_mariadb.php` (versão corrigida)
- ✅ `api/estoque-relatorio.php` (já corrigido)

### **Scripts de Banco:**
- ✅ `database/movimentacoes_tables_mariadb.sql`
- ✅ `database/update_produtos_preco_medio_mariadb.sql`

## ⚡ **Após Executar os Scripts:**

1. **Substitua o arquivo de movimentações:**
   ```bash
   mv api/movimentacoes_mariadb.php api/movimentacoes.php
   ```

2. **Teste o sistema:**
   - Acesse a página de Produtos & Estoque
   - Crie uma movimentação de entrada
   - Veja se o preço médio é calculado automaticamente

## 🎯 **O que Funcionará:**

✅ **Preço Médio Ponderado**: (50 × R$ 10 + 20 × R$ 20) ÷ 70 = R$ 12,86  
✅ **Valores Totais**: Custo total e venda total do estoque  
✅ **Movimentações Automáticas**: Atualização de estoque e preços  
✅ **Interface Completa**: Formulários e relatórios funcionando  

## 🆘 **Se Ainda Der Erro:**

1. **Verifique a versão do MariaDB:**
   ```sql
   SELECT VERSION();
   ```

2. **Verifique se as tabelas foram criadas:**
   ```sql
   SHOW TABLES LIKE '%movimentacoes%';
   SHOW TABLES LIKE '%fornecedores%';
   ```

3. **Verifique se as funções foram criadas:**
   ```sql
   SHOW FUNCTION STATUS WHERE Name = 'calcular_preco_medio_ponderado';
   SHOW PROCEDURE STATUS WHERE Name = 'atualizar_estoque_preco_medio';
   ```

---

**🎉 Agora está tudo corrigido para MariaDB/MySQL!**
