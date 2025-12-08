# Mapa de Clientes - Documentação

## Visão Geral

O sistema agora possui geocodificação automática de clientes e visualização em mapa interativo. Quando um CEP é inserido no cadastro de clientes, o sistema automaticamente busca as coordenadas geográficas e as salva no banco de dados.

## Funcionalidades

### 1. Geocodificação Automática

Quando você cadastra ou edita um cliente:

1. Digite o CEP no formulário
2. O sistema busca automaticamente:
   - Endereço completo via BrasilAPI
   - Coordenadas (latitude/longitude) via Nominatim
3. As coordenadas são salvas no banco de dados
4. **Nenhuma entrada manual é necessária!**

### 2. Mapa Interativo de Clientes

Acesse através do menu lateral: **Mapa de Clientes**

#### Características:
- **Vista Panorâmica**: Zoom inicial em nível 5 para ver regiões completas
- **Auto-ajuste**: O mapa se ajusta automaticamente para mostrar todos os clientes
- **Clustering**: Marcadores são agrupados quando há muitos clientes próximos
- **Cores por Tipo**:
  - 🟢 Verde: Cliente
  - 🔵 Azul: Fornecedor
  - 🟣 Roxo: Ambos (Cliente e Fornecedor)

#### Estatísticas:
- Total de clientes cadastrados
- Clientes com localização
- Clientes pendentes de geocodificação
- Percentual de cobertura

#### Popup de Informações:
Clique em qualquer marcador para ver:
- Nome do cliente
- Cidade e Estado
- Telefone
- E-mail
- Vendedor responsável

## Migração do Banco de Dados

Para habilitar a funcionalidade, execute a migration no Supabase:

```sql
-- Execute o arquivo: database/migrations/018_add_geolocation_to_clientes.sql
```

A migration adiciona os seguintes campos à tabela `clientes_fornecedores`:
- `latitude` (DECIMAL): Coordenada de latitude
- `longitude` (DECIMAL): Coordenada de longitude
- `geocoded_at` (TIMESTAMP): Data/hora da geocodificação
- `geocoding_source` (VARCHAR): Fonte da geocodificação (brasilapi, nominatim, etc)
- `geocoding_precision` (VARCHAR): Precisão (exact, street, city, approximate)

## APIs Utilizadas

### BrasilAPI
- **URL**: https://brasilapi.com.br
- **Uso**: Validação e padronização de endereços via CEP
- **Gratuita**: Sem necessidade de API key
- **Rate Limit**: Sem limite conhecido

### Nominatim (OpenStreetMap)
- **URL**: https://nominatim.openstreetmap.org
- **Uso**: Geocodificação (conversão endereço → lat/lng)
- **Gratuita**: Sem necessidade de API key
- **Rate Limit**: 1 requisição por segundo
- **Política**: Respeitar rate limit é obrigatório

## Tecnologias

- **Leaflet**: Biblioteca JavaScript para mapas interativos
- **React-Leaflet**: Componentes React para Leaflet
- **React-Leaflet-Cluster**: Plugin para agrupar marcadores
- **OpenStreetMap**: Tiles do mapa (gratuito)

## Troubleshooting

### Clientes não aparecem no mapa

**Causa**: Cliente não tem coordenadas (latitude/longitude) salvas.

**Solução**: 
1. Edite o cliente
2. Certifique-se que o CEP está correto
3. Salve novamente (a geocodificação será feita automaticamente)

### Erro "Unable to geocode"

**Possíveis causas**:
- CEP inválido ou não encontrado
- Endereço muito genérico
- Rate limit da API Nominatim atingido

**Solução**:
- Verifique se o CEP está correto
- Aguarde alguns segundos e tente novamente
- Certifique-se que cidade e estado estão preenchidos

### Mapa não carrega

**Possíveis causas**:
- Nenhum cliente com coordenadas
- Erro de rede
- Bloqueio de OpenStreetMap

**Solução**:
1. Verifique se há clientes cadastrados com CEP
2. Verifique conexão com internet
3. Teste se consegue acessar: https://www.openstreetmap.org

## Limitações

1. **Precisão**: Depende da qualidade dos dados do OpenStreetMap
2. **Rate Limit**: Nominatim permite apenas 1 requisição por segundo
3. **Dependência de CEP**: Funciona melhor com CEPs válidos
4. **Cobertura**: Áreas rurais podem ter precisão reduzida

## Melhorias Futuras

Possíveis expansões do sistema:

- [ ] Filtros por vendedor, estado, cidade
- [ ] Modo heatmap para densidade
- [ ] Cálculo de rotas otimizadas
- [ ] Territórios de vendedores
- [ ] Exportação de mapa em PDF/imagem
- [ ] Métricas de vendas por região
- [ ] Integração com Google Maps (se necessário maior precisão)

## Suporte

Em caso de problemas, verifique:
1. Migration foi aplicada corretamente
2. Clientes têm CEP válido
3. Logs do console do navegador
4. Logs do servidor Next.js

---

**Última atualização**: 2025-12-08
