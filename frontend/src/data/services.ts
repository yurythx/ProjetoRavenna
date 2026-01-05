// Catálogo de Serviços - Dados Centralizados

export interface Service {
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    fullDescription: string;
    features: string[];
    technologies: string[];
    url: string;
    icon: string;
    color: string;
    internal: boolean;
    badge?: string;
    category: 'media' | 'automation' | 'management' | 'infrastructure' | 'content';
    useCases: string[];  // Onde é aplicado
    benefits: string[];   // Vantagens
    whyUse: string;      // Por que usar
}

export const servicesData: Service[] = [
    {
        id: '1',
        slug: 'artigos',
        title: 'Artigos & Blog',
        shortDescription: 'Sistema de gestão de conteúdo desenvolvido em Django + Next.js com autenticação JWT, editor WYSIWYG e API RESTful.',
        fullDescription: 'Plataforma completa de gestão de conteúdo desenvolvida com Django no backend e Next.js no frontend. Oferece autenticação JWT segura, editor WYSIWYG avançado (TinyMCE), sistema robusto de categor ias e tags, versionamento de artigos, controle de visibilidade (público/privado), filtros avançados de busca e API RESTful com documentação OpenAPI automática para fácil integração.',
        features: [
            'Autenticação JWT segura',
            'Editor WYSIWYG (TinyMCE)',
            'Sistema de categorias e tags',
            'Versionamento de artigos',
            'Modo público/privado',
            'Filtros avançados',
            'API RESTful com OpenAPI',
            'Markdown support',
            'SEO otimizado',
            'Busca full-text'
        ],
        technologies: ['Django', 'Next.js', 'PostgreSQL', 'JWT', 'TinyMCE', 'REST API'],
        url: '/artigos',
        icon: 'BookOpen',
        color: '#44B78B',
        internal: true,
        badge: 'Módulo Django',
        category: 'content',
        useCases: [
            'Blogs corporativos e pessoais',
            'Portais de notícias e mídia',
            'Bases de conhecimento interno',
            'Documentação técnica',
            'Publicação de conteúdo educacional'
        ],
        benefits: [
            'Interface intuitiva e moderna',
            'SEO otimizado para melhor ranqueamento',
            'Versionamento completo de conteúdo',
            'API para integrações externas',
            'Controle granular de permissões',
            'Performance otimizada com Next.js'
        ],
        whyUse: 'Ideal para quem precisa de uma plataforma de publicação profissional com total controle sobre o conteúdo, SEO avançado e capacidade de integração através de API REST. Perfeito para empresas que querem centralizar sua produção de conteúdo com workflow aproveitável.'
    },
    {
        id: '13',
        slug: 'django-admin',
        title: 'Django Admin',
        shortDescription: 'Painel administrativo do Django para gerenciamento de dados, usuários e configurações do sistema.',
        fullDescription: 'Django Admin é o painel administrativo integrado do Django que permite gerenciamento completo do backend. Oferece interface CRUD automática para todos os modelos, gestão avançada de usuários e permissões, editor de conteúdo inline, filtros e buscas personalizadas, ações em lote, histórico de alterações auditável, customização completa da interface e extensibilidade através de plugins. Ideal para administradores do sistema gerenciarem dados sem precisar de interface dedicada.',
        features: [
            'Interface CRUD automática',
            'Gestão de usuários e permissões',
            'Editor inline de relações',
            'Filtros e buscas avançadas',
            'Ações em lote',
            'Histórico de alterações',
            'Customização de interface',
            'Plugins extensíveis',
            'Exportação de dados',
            'Interface responsiva'
        ],
        technologies: ['Django', 'Python', 'PostgreSQL', 'Bootstrap'],
        url: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')}/admin/` : 'https://api.projetoravenna.cloud/admin/',
        icon: 'Server',
        color: '#0C4B33',
        internal: false,
        badge: 'Django Core',
        category: 'management',
        useCases: [
            'Administração do sistema',
            'Gestão de usuários e permissões',
            'Edição de conteúdo do site',
            'Configuração de módulos',
            'Visualização de logs e auditoria',
            'Manutenção de dados'
        ],
        benefits: [
            'Interface administrativa pronta',
            'Gestão completa de usuários',
            'Ações em lote para produtividade',
            'Auditoria com histórico completo',
            'Totalmente customizável',
            'Integrado ao sistema Django'
        ],
        whyUse: 'Painel administrativo poderoso incluído no Django para gerenciar todo backend do sistema. Permite administradores controlarem usuários, editarem conteúdo, configurarem módulos e auditarem mudanças sem precisar desenvolver interface administrativa separada.'
    },
    {
        id: '2',
        slug: 'jellyfin',
        title: 'Jellyfin',
        shortDescription: 'Servidor de mídia open-source com streaming adaptativo, transcodificação em tempo real e sincronização multi-dispositivo.',
        fullDescription: 'Jellyfin é uma solução completa de servidor de mídia open-source que oferece streaming adaptativo (HLS/DASH), transcodificação em tempo real com suporte a múltiplos codecs, sincronização perfeita entre dispositivos, legendas personalizadas, controle parental robusto, detecção automática de metadata através de TMDB/TVDB, aplicativos nativos para Android/iOS/TV e funcionalidade de reprodução offline.',
        features: [
            'Streaming adaptativo (HLS/DASH)',
            'Transcodificação em tempo real',
            'Sincronização multi-dispositivo',
            'Legendas personalizadas',
            'Controle parental',
            'Metadata automática (TMDB/TVDB)',
            'Apps nativos (Android/iOS/TV)',
            'Reprodução offline',
            'Live TV e DVR',
            'Plugins extensíveis'
        ],
        technologies: ['C#', '.NET', 'FFmpeg', 'HLS', 'DASH', 'SQLite'],
        url: process.env.NEXT_PUBLIC_URL_JELLYFIN || 'https://jellyfin.projetoravenna.cloud',
        icon: 'Film',
        color: '#AA5CC3',
        internal: false,
        category: 'media',
        useCases: [
            'Biblioteca pessoal de filmes e séries',
            'Streaming familiar multi-usuário',
            'Servidor de mídia empresarial',
            'Arquivo de vídeos educacionais',
            'Distribuição de conteúdo interno'
        ],
        benefits: [
            '100% gratuito e open-source',
            'Sem taxas ou assinaturas',
            'Total privacidade dos dados',
            'Transcodificação automática adaptativa',
            'Suporte a múltiplos formatos',
            'Apps para todas as plataformas'
        ],
        whyUse: 'Alternativa completa e gratuita a serviços pagos como Plex ou Emby. Perfeito para quem quer total controle sobre sua biblioteca de mídia sem mensalidades, com privacidade garantida e recursos profissionais de streaming.'
    },
    {
        id: '3',
        slug: 'komga',
        title: 'Komga',
        shortDescription: 'Servidor de biblioteca digital especializado em CBZ/CBR/PDF/EPUB com leitor web responsivo e sincronização de progresso.',
        fullDescription: 'Komga é um servidor especializado em biblioteca digital focado em quadrinhos e livros digitais. Suporta formatos CBZ/CBR/PDF/EPUB com leitor web responsivo e moderno, sincronização automática de progresso de leitura, gestão inteligente de coleções e séries, extração automática de metadados, suporte completo ao protocolo OPDS para integração com apps externos, sistema de gestão multi-usuário e API REST completa para desenvolvedores.',
        features: [
            'Formatos: CBZ/CBR/PDF/EPUB',
            'Leitor web responsivo',
            'Sincronização de progresso',
            'Gestão de coleções e séries',
            'Extração automática de metadados',
            'Suporte OPDS',
            'Gestão multi-usuário',
            'API REST completa',
            'Thumbnails automáticos',
            'Busca avançada'
        ],
        technologies: ['Kotlin', 'Spring Boot', 'Vue.js', 'H2 Database', 'OPDS'],
        url: process.env.NEXT_PUBLIC_URL_KOMGA || 'https://komga.projetoravenna.cloud',
        icon: 'Library',
        color: '#F97316',
        internal: false,
        category: 'media',
        useCases: [
            'Biblioteca pessoal de quadrinhos',
            'Organização de mangás e HQs',
            'Arquivo de revistas digitais',
            'Distribuição de e-books corporativos',
            'Coleções de documentos PDF'
        ],
        benefits: [
            'Interface limpa e moderna',
            'Sincronização entre dispositivos',
            'Gestão automática de metadata',
            'Suporte OPDS para apps mobile',
            'Controle de progresso de leitura',
            'Multi-usuário com permissões'
        ],
        whyUse: 'Solução perfeita para organizar e ler coleções de quadrinhos, mangás e livros digitais. Oferece experiência profissional de leitura com sincronização automática e integração com seus apps favoritos através do protocolo OPDS.'
    },
    {
        id: '4',
        slug: 'evolution-api',
        title: 'Evolution API',
        shortDescription: 'API não-oficial do WhatsApp com gerenciamento de múltiplas instâncias, webhooks e envio de mensagens multimídia.',
        fullDescription: 'Evolution API é uma API não-oficial do WhatsApp construída sobre a biblioteca Baileys. Permite gerenciamento de múltiplas instâncias WhatsApp simultaneamente, envio e recebimento de mensagens em diversos formatos (texto, mídia, áudio, documentos), webhooks em tempo real para eventos, autenticação via QR Code, gerenciamento completo de grupos, status e integração via REST e Websocket para máxima flexibilidade.',
        features: [
            'Múltiplas instâncias WhatsApp',
            'Envio de mensagens (texto, mídia, áudio)',
            'Webhooks em tempo real',
            'QR Code authentication',
            'Gerenciamento de grupos',
            'Status e histórias',
            'Integração REST/Websocket',
            'Documentos e arquivos',
            'Mensagens agendadas',
            'Chatbot integration'
        ],
        technologies: ['Node.js', 'Baileys', 'WebSocket', 'REST API', 'QR Code'],
        url: process.env.NEXT_PUBLIC_URL_EVOLUTION || 'https://evolution.projetoravenna.cloud/manager',
        icon: 'Cpu',
        color: '#10B981',
        internal: false,
        category: 'automation',
        useCases: [
            'Atendimento automatizado',
            'Notificações transacionais',
            'Marketing e campanhas',
            'Integração com CRM',
            'Chatbots inteligentes',
            'Automação de vendas'
        ],
        benefits: [
            'Múltiplas instâncias simultâneas',
            'Webhooks em tempo real',
            'API REST completa',
            'Envio de mídia e documentos',
            'Sem limitações de mensagens',
            'Total controle e privacidade'
        ],
        whyUse: 'Essencial para empresas que precisam automatizar comunicação via WhatsApp sem depender de APIs oficiais caras. Permite criar chatbots, enviar notificações em massa e integrar WhatsApp com qualquer sistema através de API REST moderna.'
    },
    {
        id: '5',
        slug: 'chatwoot',
        title: 'Chatwoot',
        shortDescription: 'Plataforma de atendimento omnichannel com inbox unificado, automações com chatbots e CRM embutido.',
        fullDescription: 'Chatwoot é uma plataforma completa de atendimento ao cliente omnichannel. Oferece inbox unificado integrando WhatsApp, Telegram, Email e Webchat, automações inteligentes com chatbots, macros de respostas rápidas, atribuição inteligente de tickets baseada em regras, relatórios analíticos detalhados, integrações nativas com Slack e Webhooks, CRM embutido para gestão de contatos e gestão completa de equipes com métricas de performance.',
        features: [
            'Inbox unificado',
            'WhatsApp, Telegram, Email',
            'Chatbots e automações',
            'Macros de respostas',
            'Atribuição inteligente',
            'Relatórios analíticos',
            'Integrações (Slack, Webhooks)',
            'CRM embutido',
            'Gestão de equipes',
            'SLA e métricas'
        ],
        technologies: ['Ruby on Rails', 'Vue.js', 'PostgreSQL', 'Redis', 'Sidekiq'],
        url: process.env.NEXT_PUBLIC_URL_CHATWOOT || 'https://atendimento.projetoravenna.cloud',
        icon: 'MessageCircle',
        color: '#06B6D4',
        internal: false,
        category: 'management',
        useCases: [
            'Suporte ao cliente multicanal',
            'Central de atendimento empresarial',
            'Gestão de tickets e chamados',
            'Atendimento pós-venda',
            'SAC automatizado',
            'Help desk interno'
        ],
        benefits: [
            'Inbox único para todos canais',
            'Automação com chatbots',
            'CRM integrado gratuito',
            'Relatórios em tempo real',
            'Gestão de equipe completa',
            'Open-source e customizável'
        ],
        whyUse: 'Plataforma completa para centralizar todo atendimento em um único lugar. Ideal para empresas que atendem por múltiplos canais e precisam organizar, automatizar e medir performance do suporte ao cliente com ferramentas profissionais.'
    },
    {
        id: '6',
        slug: 'n8n',
        title: 'n8n',
        shortDescription: 'Plataforma de automação de workflows com 400+ integrações nativas e transformação de dados com JavaScript.',
        fullDescription: 'n8n é uma poderosa plataforma de automação de workflows no-code/low-code. Oferece mais de 400 integrações nativas com serviços como Google, AWS, Databases e APIs diversas, triggers baseados em eventos, webhooks e schedulers, transformação avançada de dados com JavaScript, execuções condicionais e loops, tratamento robusto de erros, versionamento completo de fluxos e interface visual intuitiva para criação de automações complexas.',
        features: [
            '400+ integrações nativas',
            'Triggers (eventos/webhook/schedule)',
            'Transformação de dados (JavaScript)',
            'Execuções condicionais',
            'Loops e iterações',
            'Tratamento de erros',
            'Versionamento de fluxos',
            'Interface visual',
            'Self-hosted',
            'API webhooks'
        ],
        technologies: ['Node.js', 'TypeScript', 'Vue.js', 'SQLite', 'PostgreSQL'],
        url: process.env.NEXT_PUBLIC_URL_N8N || 'https://n8n.projetoravenna.cloud',
        icon: 'Zap',
        color: '#F59E0B',
        internal: false,
        category: 'automation',
        useCases: [
            'Automação de processos empresariais',
            'Integração entre sistemas',
            'Sincronização de dados',
            'Notificações automatizadas',
            'ETL e processamento de dados',
            'Monitoramento e alertas'
        ],
        benefits: [
            'Mais de 400 integrações prontas',
            'Interface visual drag-and-drop',
            'Execução self-hosted (dados seguros)',
            'Código customizado em JavaScript',
            'Versionamento de workflows',
            'Sem limites de execuções'
        ],
        whyUse: 'Alternativa open-source ao Zapier/Make com total controle. Perfeito para automatizar tarefas repetitivas, integrar sistemas diversos e criar fluxos complexos sem depender de serviços pagos em nuvem, mantendo seus dados seguros.'
    },
    {
        id: '7',
        slug: 'nextcloud',
        title: 'Nextcloud',
        shortDescription: 'Plataforma de nuvem auto-hospedada com compartilhamento Samba/SMB, calendário, colaboração em documentos e E2E encryption.',
        fullDescription: 'Nextcloud é uma plataforma completa de armazenamento em nuvem auto-hospedada. Oferece sincronização automática de arquivos entre múltiplos dispositivos, compartilhamento Samba/SMB integrado (fonte de mídia para Jellyfin e Komga), calendário e contatos sincronizados, chat integrado, colaboração em tempo real em documentos (OnlyOffice/Collabora), criptografia end-to-end opcional, sistema extensível de apps e total controle sobre seus dados.',
        features: [
            'Sincronização multi-dispositivo',
            'Compartilhamento Samba/SMB',
            'Calendário e contatos',
            'Chat integrado',
            'Colaboração em documentos',
            'Criptografia E2E',
            'Apps extensíveis',
            'Versionamento de arquivos',
            'Galeria de fotos',
            'Notas e tarefas'
        ],
        technologies: ['PHP', 'JavaScript', 'MySQL', 'Redis', 'Samba', 'OnlyOffice'],
        url: process.env.NEXT_PUBLIC_URL_NEXTCLOUD || 'https://nextcloud.projetoravenna.cloud',
        icon: 'Cloud',
        color: '#0082C9',
        internal: false,
        category: 'infrastructure',
        useCases: [
            'Armazenamento pessoal em nuvem',
            'Compartilhamento de arquivos corporativo',
            'Colaboração em equipe',
            'Backup automático de fotos',
            'Substituição do Google Drive/Dropbox',
            'Central de arquivos de mídia'
        ],
        benefits: [
            'Total privacidade e controle',
            'Sem limites de armazenamento',
            'Colaboração em documentos Office',
            'Sincronização automática',
            'Acesso de qualquer lugar',
            'Extensível com apps'
        ],
        whyUse: 'Solução completa para quem quer privacidade total sem depender de Google Drive ou Dropbox. Oferece todos recursos de nuvem moderna com colaboração, calendário e chat, mantendo seus dados sob seu controle.'
    },
    {
        id: '8',
        slug: 'glpi',
        title: 'GLPI',
        shortDescription: 'Sistema ITSM open-source para gestão de ativos de TI, help desk com ticketing multicanal e CMDB integrado.',
        fullDescription: 'GLPI é um sistema completo de ITSM (IT Service Management) open-source. Oferece gestão abrangente de ativos de TI, inventário automatizado via FusionInventory, sistema de help desk com ticketing multicanal, gestão de SLA/OLA, base de conhecimento integrada, gestão de contratos e fornecedores, sistema de reservas de equipamentos, CMDB (Configuration Management Database) integrado e relatórios personalizáveis para análise completa.',
        features: [
            'Gestão de ativos de TI',
            'Inventário automatizado (FusionInventory)',
            'Help desk ticketing',
            'SLA/OLA',
            'Base de conhecimento',
            'Gestão de contratos',
            'Reservas de equipamentos',
            'CMDB integrado',
            'Relatórios personalizáveis',
            'Portal self-service'
        ],
        technologies: ['PHP', 'MariaDB', 'JavaScript', 'FusionInventory', 'LDAP'],
        url: process.env.NEXT_PUBLIC_URL_GLPI || 'https://glpi.projetoravenna.cloud',
        icon: 'TicketCheck',
        color: '#E74C3C',
        internal: false,
        category: 'management',
        useCases: [
            'Gestão de TI empresarial',
            'Help desk e suporte técnico',
            'Controle de ativos e inventário',
            'Gestão de contratos de TI',
            'Service desk ITIL',
            'Gerenciamento de incidentes'
        ],
        benefits: [
            'ITSM completo open-source',
            'Inventário automático de equipamentos',
            'Gestão completa de SLA',
            'Base de conhecimento integrada',
            'CMDB para documentação de infraestrutura',
            'Portal self-service para usuários'
        ],
        whyUse: 'Plataforma profissional de gestão de TI seguindo práticas ITIL. Ideal para departamentos de TI que precisam organizar ativos, gerenciar chamados, controlar SLAs e manter documentação completa da infraestrutura de forma centralizada.'
    },
    {
        id: '9',
        slug: 'zabbix',
        title: 'Zabbix',
        shortDescription: 'Plataforma de monitoramento empresarial com coleta de métricas em tempo real, triggers inteligentes e integração com Grafana.',
        fullDescription: 'Zabbix é uma plataforma empresarial de monitoramento de infraestrutura de TI. Oferece coleta de métricas em tempo real (CPU, RAM, disco, rede), triggers inteligentes com múltiplos níveis de severidade, sistema robusto de alertas via Email/SMS/Slack, dashboards customizáveis e interativos, auto-discovery automático de dispositivos, biblioteca de templates prontos para uso, API REST completa e integração nativa com Grafana para visualizações avançadas.',
        features: [
            'Métricas em tempo real',
            'Triggers inteligentes',
            'Alertas (Email/SMS/Slack)',
            'Dashboards customizáveis',
            'Auto-discovery',
            'Templates prontos',
            'API REST',
            'Integração Grafana',
            'Maps de rede',
            'Histórico de dados'
        ],
        technologies: ['C', 'PHP', 'PostgreSQL', 'TimescaleDB', 'Grafana'],
        url: process.env.NEXT_PUBLIC_URL_ZABBIX || 'https://zabbix.projetoravenna.cloud',
        icon: 'Activity',
        color: '#D40000',
        internal: false,
        category: 'infrastructure',
        useCases: [
            'Monitoramento de servidores',
            'Monitoramento de rede',
            'Alertas de infraestrutura',
            'Monitoramento de aplicações',
            'Análise de performance',
            'SLA tracking'
        ],
        benefits: [
            'Monitoramento em tempo real',
            'Alertas inteligentes customizáveis',
            'Auto-discovery de dispositivos',
            'Histórico completo de métricas',
            'Dashboards interativos',
            'Escalável para grandes ambientes'
        ],
        whyUse: 'Solução empresarial completa para monitoramento de toda infraestrutura de TI. Essencial para detectar problemas antes que afetem usuários, analisar performance e manter SLAs através de monitoramento proativo e alertas inteligentes.'
    },
    {
        id: '10',
        slug: 'aapanel',
        title: 'aaPanel',
        shortDescription: 'Painel de controle de servidor web open-source para gestão de sites, bancos de dados, SSL e backups automáticos.',
        fullDescription: 'aaPanel é um painel de controle de servidor web open-source, alternativa gratuita ao cPanel. Permite gestão completa de sites e domínios, administração de bancos de dados MySQL/PostgreSQL, serviço FTP integrado, gestão de DNS, certificados SSL automáticos via Let\'s Encrypt, sistema de backups automáticos agendados, monitoramento em tempo real de recursos do servidor, firewall integrado, suporte tanto para NGINX quanto Apache e interface multi-idioma.',
        features: [
            'Gestão de sites e domínios',
            'MySQL/PostgreSQL',
            'FTP integrado',
            'DNS management',
            'SSL Let\'s Encrypt',
            'Backups automáticos',
            'Monitoramento de recursos',
            'Firewall integrado',
            'NGINX/Apache',
            'Interface multi-idioma'
        ],
        technologies: ['Python', 'NGINX', 'Apache', 'MySQL', 'SSL/TLS'],
        url: process.env.NEXT_PUBLIC_URL_AAPANEL || 'https://aapanel.projetoravenna.cloud',
        icon: 'Server',
        color: '#1890FF',
        internal: false,
        category: 'infrastructure',
        useCases: [
            'Hosting de múltiplos sites',
            'Gerenciamento de servidores web',
            'Hospedagem de aplicações',
            'Gestão de bancos de dados',
            'Administração de VPS/Dedicados',
            'Ambiente de desenvolvimento'
        ],
        benefits: [
            'Gratuito e open-source',
            'Interface intuitiva',
            'SSL automático gratuito',
            'Backups agendados',
            'Monitoramento incluído',
            'Suporte NGINX e Apache'
        ],
        whyUse: 'Alternativa gratuita ao cPanel para gerenciar servidores web. Perfeito para quem precisa hospedar múltiplos sites, gerenciar bancos de dados e ter controle completo do servidor sem pagar mensalidades caras de painéis proprietários.'
    },
    {
        id: '11',
        slug: 'portainer',
        title: 'Portainer',
        shortDescription: 'Interface web para gerenciamento de containers Docker e Kubernetes com deploy via UI, logs em tempo real e RBAC.',
        fullDescription: 'Portainer é uma interface web completa para gerenciamento de containers Docker e Kubernetes. Oferece visualização detalhada de stacks, volumes, networks e images, deploy simplificado via interface UI ou Docker Compose, logs em tempo real com busca, console interativo integrado, controle granular de recursos (CPU/RAM limits), sistema RBAC multi-usuário para controle de acesso, biblioteca de templates de aplicações prontas e integração com múltiplos registries de containers.',
        features: [
            'Visualização de stacks/volumes/networks',
            'Deploy via UI/Docker Compose',
            'Logs em tempo real',
            'Console interativo',
            'Controle de recursos (CPU/RAM)',
            'RBAC multi-usuário',
            'Templates de apps',
            'Integração com registries',
            'Gestão Kubernetes',
            'Edge computing'
        ],
        technologies: ['Go', 'Angular', 'Docker', 'Kubernetes', 'Swarm'],
        url: process.env.NEXT_PUBLIC_URL_PORTAINER || 'https://portainer.projetoravenna.cloud',
        icon: 'Container',
        color: '#13BEF9',
        internal: false,
        category: 'infrastructure',
        useCases: [
            'Gerenciamento de containers Docker',
            'Orquestração Kubernetes',
            'Deploy de aplicações',
            'Monitoramento de containers',
            'Gestão de ambientes dev/prod',
            'DevOps e CI/CD'
        ],
        benefits: [
            'Interface visual intuitiva',
            'Deploy sem linha de comando',
            'Logs centralizados em tempo real',
            'Multi-ambiente e multi-usuário',
            'Templates para deploy rápido',
            'Suporte Docker e Kubernetes'
        ],
        whyUse: 'Simplifica drasticamente gestão de containers Docker e Kubernetes através de interface visual. Ideal para equipes que precisam deploy rápido, monitoramento centralizado e controle de acesso sem precisar decorar comandos complexos.'
    },
    {
        id: '12',
        slug: 'pdv',
        title: 'PDV - Sistema de Vendas',
        shortDescription: 'Sistema completo de ponto de venda para restaurantes com gestão de estoque, financeiro, vendas e relatórios.',
        fullDescription: 'PDV é um sistema completo de ponto de venda desenvolvido especialmente para restaurantes e estabelecimentos alimentícios. Oferece gestão integrada de vendas com terminal touchscreen otimizado, controle detalhado de estoque com alertas de reposição automática, módulo financeiro completo com contas a pagar/receber e fluxo de caixa, gestão de mesas e comandas, cardápio digital integrado, múltiplas formas de pagamento (dinheiro, cartão, PIX), emissão de nota fiscal eletrônica (NF-e/NFC-e), relatórios gerenciais detalhados e dashboard em tempo real para acompanhamento das vendas.',
        features: [
            'Terminal touchscreen otimizado',
            'Controle de estoque integrado',
            'Alertas de reposição automática',
            'Gestão financeira completa',
            'Contas a pagar/receber',
            'Fluxo de caixa em tempo real',
            'Gestão de mesas e comandas',
            'Cardápio digital',
            'Múltiplas formas de pagamento',
            'Emissão NF-e/NFC-e',
            'Relatórios gerenciais',
            'Dashboard em tempo real',
            'Gestão de funcionários',
            'Controle de delivery',
            'Programa de fidelidade'
        ],
        technologies: ['Django', 'React', 'PostgreSQL', 'Redis', 'Celery', 'REST API', 'WebSocket'],
        url: process.env.NEXT_PUBLIC_URL_PDV || 'https://pdv.projetoravenna.cloud',
        icon: 'ShoppingCart',
        color: '#FF6B35',
        internal: false,
        category: 'management',
        useCases: [
            'Restaurantes e lanchonetes',
            'Bares e cafeterias',
            'Food trucks',
            'Delivery e take-out',
            'Franquias alimentícias',
            'Estabelecimentos multi-unidade'
        ],
        benefits: [
            'Interface touchscreen otimizada',
            'Controle total de estoque e custos',
            'Gestão financeira integrada',
            'Emissão automática de notas fiscais',
            'Relatórios gerenciais em tempo real',
            'Suporte a delivery e comandas',
            'Programa de fidelidade incluído',
            'Multi-unidade e multi-caixa'
        ],
        whyUse: 'Sistema completo desenvolvido especificamente para restaurantes. Elimina planilhas, integra vendas-estoque-financeiro e fornece visão 360º do negócio através de dashboard em tempo real. Perfeito para profissionalizar gestão e aumentar lucratividade.'
    }
];

export const getServiceBySlug = (slug: string): Service | undefined => {
    return servicesData.find(service => service.slug === slug);
};

export const getServicesByCategory = (category: string): Service[] => {
    return servicesData.filter(service => service.category === category);
};
