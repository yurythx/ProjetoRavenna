# Documentação do Game Server (C#)

Servidor autoritativo de alta performance para lógica de jogo em tempo real.

---

## 🏗️ Core Tecnológico
*   **Linguagem**: .NET 8 (C#).
*   **Networking**: UDP + **KCP**.
*   **Serialização**: Protobuf.

---

## 📂 Componentes Principais

### `Network/`
*   **UdpSocketListener**: Escuta conexões na porta 7777.
*   **KcpConnection**: Implementa a confiabilidade sobre o UDP.
*   **JWT Validation**: Valida o acesso do jogador usando a chave pública RSA compartilhada pelo Backend.

### `Simulation/`
*   **SimulationLoop**: Loop de jogo autoritativo (20-60 Hz).
*   **SpatialGrid**: Implementação de *Interest Management*. Reduz o processamento ao ignorar entidades longe demais do jogador.
*   **Movement Validation**: Impede hacks de velocidade (speedhack) e teletransporte.

### `Bridge/`
*   **DjangoBridge**: Envia atualizações críticas de progresso (XP, itens coletados, fim de sessão) para a API Django.

---

## 🔄 Ciclo de Vida do Jogador
1.  **Auth**: Jogador entra com JWT via Handshake.
2.  **Load**: Servidor carrega o estado do inventário e stats do personagem.
3.  **Play**: Servidor processa inputs e envia Snapshots do mundo.
4.  **Save**: Ao desconectar ou em intervalos regulares, o servidor sincroniza o progresso com o Backend.
