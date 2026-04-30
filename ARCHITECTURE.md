# Arquitetura Técnica: Projeto Ravenna

Este documento fornece detalhes profundos sobre as escolhas arquiteturais e o fluxo de dados entre os componentes.

## 🔄 Fluxo de Dados de uma Sessão de Jogo

1.  **Autenticação (Web/Unity):**
    *   O jogador faz login via `/api/v1/accounts/login/`.
    *   O Backend assina um **JWT RS256** contendo o `user_id` e o `character_id`.
2.  **Handshake do GameServer:**
    *   O cliente Unity conecta ao GameServer (UDP Port 7777).
    *   O servidor recebe o JWT e valida a assinatura usando `public.pem`.
    *   O servidor inicia a simulação KCP.
3.  **Simulação Autoritativa:**
    *   O servidor processa ticks de simulação.
    *   Sincroniza o estado do mundo via `S2C_WorldSnapshot` (Protobuf).
4.  **Sincronização de Progresso:**
    *   Eventos de jogo (XP ganho, Item coletado) são enviados do GameServer para o Backend via chamadas de Bridge (HTTP).
    *   O Backend usa `select_for_update()` para garantir atomicidade no Postgres.
5.  **Persistência e Cache:**
    *   **Postgres:** Estado final e histórico.
    *   **Redis:** Rankings em tempo real e cache de sessão.

## 🛡️ Camadas de Segurança

### Anti-Cheat
*   **Identificação:** Cada usuário é vinculado a um **HWID** único.
*   **Validação de XP:** O Backend rejeita deltas de XP que excedam o máximo teórico por segundo.
*   **Interest Management:** O servidor não envia a localização de inimigos que estão fora do raio de visão do jogador, prevenindo wallhacks.

### Concorrência
*   Todas as operações de escrita em contadores (fórum) e recursos (ouro/XP) utilizam transações atômicas para suportar múltiplos containers de API rodando em paralelo.

## 🛠️ Tecnologias Principais

*   **Django 5.0 + DRF:** API robusta e madura.
*   **Next.js 15:** UI moderna com SSR e revalidação de dados.
*   **KCP Protocol:** Velocidade do UDP com a confiabilidade do TCP onde necessário.
*   **Protocol Buffers:** Minimização de payload.
*   **RSA Encryption:** Confiança descentralizada entre os serviços.
