# Brightfield Solar — Caso 09

Fundação técnica e componentes do [caso 09 da Alvorada](https://github.com/Alvorada-Dev/desafios-tecnicos/blob/main/casos/09-pagina-de-cidade.md): Next.js App Router, dados locais e página pública mínima de Phoenix preservada. Empresa, números, incentivos, equipes e depoimentos são fictícios; não são orientação tributária atual. WEB 02 acrescenta componentes reutilizáveis e uma prévia isolada, não a landing page final. Sem publicação ou deploy.

## Executar

Requer Node **24.12.0 ou superior na linha 24** e npm **11.16.0 ou superior na linha 11**. Ambiente conferido: Node 24.12.0, npm 11.16.0 e Git 2.45.2.windows.1. Não precisa de ferramentas globais, variáveis secretas nem das referências em Downloads.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000/city/phoenix-az**. A galeria WEB 02 está em **http://127.0.0.1:3000/preview/components**, exclusivamente em desenvolvimento: `robots: noindex, nofollow` e `notFound()` fora de `NODE_ENV=development`. Não há link público para ela. `dev` e `start` vinculam somente loopback; encerre com Ctrl+C. Para produção local:

```sh
npm run check
npm run build
npm run start
```

| Script                | Finalidade                                                       |
| --------------------- | ---------------------------------------------------------------- |
| `dev` / `start`       | Next em desenvolvimento / produção local (requer build)          |
| `build`               | `next build`, incluindo validação dos dados e pré-renderização   |
| `lint`                | ESLint direto; avisos também reprovam                            |
| `format`              | Formata arquivos com Prettier                                    |
| `format:check`        | Confere formatação sem modificar arquivos                        |
| `typecheck`           | `next typegen && tsc --noEmit`; gera tipos também em clone limpo |
| `test` / `test:watch` | Vitest em execução única / modo watch, ambiente Node             |
| `check`               | `format:check`, lint, typecheck e testes; build é separado       |

## Versões fixadas

`package.json` fixa versões exatas; o único lockfile é `package-lock.json`.

- Runtime: Next **16.3.8**, React e React DOM **19.3.0**.
- Qualidade: TypeScript **6.0.3**, ESLint **10.12.0**, Prettier **3.9.9**, Vitest **5.0.3**.
- Lint: `@eslint/js` **10.0.1**, `@next/eslint-plugin-next` **16.3.8**, `typescript-eslint` **8.71.1**, `eslint-plugin-react-hooks` **7.1.1**, `eslint-config-prettier` **10.1.8**.
- Tipos: `@types/node` **24.19.1**, `@types/react` e `@types/react-dom` **19.3.0**.

Escolha baseada na [instalação oficial Next](https://nextjs.org/docs/app/getting-started/installation), engines e peer dependencies do registry, não na stack da POC. TypeScript 7 ainda está fora da faixa suportada pelo typescript-eslint. [ESLint 9 está em EOL](https://eslint.org/version-support/); o preset agregado `eslint-config-next` depende de plugins sem suporte a ESLint 10. Por isso a configuração flat usa diretamente o plugin oficial Next/Core Web Vitals, regras recomendadas JS/TS e React Hooks, sem `--force`, `--legacy-peer-deps` ou supressão de erros.

## Estrutura e rota

```text
src/
  app/
    layout.tsx                 # servidor, en-US e next/font/local
    globals.css                # reset, tipografia, foco e poucos tokens
    page.tsx                   # redireciona / para Phoenix
    not-found.tsx
    not-found.module.css
    fonts/                     # IBM Plex Sans 400/500/600 + LICENSE.txt
    city/[citySlug]/
      page.tsx                 # página e metadata no servidor
      page.module.css
    preview/components/        # galeria dev, fixtures e pequeno controlador cliente
  components/
    ui/                        # Button, Container, SectionHeading, MediaPlaceholder
    sections/                  # Hero, ProcessSteps, SocialProof, FAQ, FinalCTA
  features/simulator/
    SimDrawer.tsx              # UI controlada; sem cálculo financeiro
    sim-drawer-types.ts        # passos, valores, apresentação e callbacks
  domain/cities/
    city-config.ts             # contrato readonly e validação
    phoenix.ts                 # objeto completo do brief oficial
    cities.ts                  # registro e duas consultas
    cities.test.ts             # lookup e rejeição de dados inválidos
```

- Alias `@/*` → `src/*`; TypeScript strict, sem ignorar erros de build ou declarações de dependências.
- Checagens usam os tipos atuais de `.next/types`, regenerados por `next typegen`. O cache paralelo `.next/dev` é excluído da compilação para não declarar duas vezes os mesmos tipos globais após executar dev; nenhum arquivo-fonte ou erro real é ignorado. `skipLibCheck` permanece `false`.
- `CityConfig` preserva parâmetros do cálculo, perfis, equipes, depoimentos e FAQ. `satisfies` verifica o dado TS; validação na carga do registro verifica campos obrigatórios, identidade, valores finitos, intervalos, inteiros, perfis e datas, com caminho legível no erro. O build carrega esse registro.
- `getCityBySlug` faz lookup exato em registro estático, sem montar caminhos de arquivo. `getAllCitySlugs` fornece `generateStaticParams`. Para adicionar cidade, criar o dado conforme o contrato e cadastrá-lo no registro; não gerar as outras aproximadamente 120 cidades agora.
- Só `/city/phoenix-az` está cadastrada. `dynamicParams = false` restringe a rota; lookup ausente usa `notFound()`. `params` é aguardado conforme Next 16. Cache Components explicitamente desativado; sem experimentos.
- `/` usa `redirect()` para Phoenix enquanto ela for a única cidade. Não há segunda landing page. Slugs desconhecidos retornam 404.
- Título, descrição e conteúdo públicos usam os mesmos dados. URL é a fonte de verdade da cidade. Página pública, layout, metadata e consulta permanecem no servidor; domínio não importa React. Apenas drawer, controlador da prévia e navegação de depoimentos são ilhas cliente; sem contexto global ou localStorage.
- Vitest cobre contratos puros: dados, slugs arbitrários/propriedades de protótipo, invariantes inválidas e navegação de depoimentos. Componentes assíncronos e metadata são conferidos no servidor real, não em uma suíte DOM artificial.

## Verificação da fundação WEB 01

- `npm install` e `npm ci` concluídos com o lockfile final. Uma tentativa intermediária de migração do lint falhou com ERESOLVE pelo grafo antigo; foram removidos somente os artefatos gerados nesta sessão e a instalação foi refeita, sem forçar peers.
- `npm run format`, `npm run lint`, `npm run typecheck`, `npm test` (**39 testes**) e `npm run build` passaram. O typecheck inicial foi executado antes do primeiro build, com geração dos tipos. Build marcou `/city/phoenix-az` como **SSG**.
- A primeira execução de `check` após dev expôs declarações duplicadas entre os dois caches Next. A seleção explícita do conjunto gerado por `next typegen` corrigiu a causa sem apagar caches, relaxar tipos ou exigir limpeza manual. `npm run check` e `npm run build` passaram também após executar dev.
- Produção em `http://127.0.0.1:3217`: Phoenix **200**, um `main`/`h1`, title e description presentes no HTML; slug desconhecido **404**; `/` **307** com Location `/city/phoenix-az`. Link da 404 retorna a Phoenix e possui foco visível.
- Navegador real em 1280×800 e 390×844: conteúdo legível, sem overflow horizontal ou erros de execução em Phoenix; três pesos da fonte carregados localmente. Contraste texto/céu 8,88:1, título/céu 12,78:1. Isso não substitui a validação completa do Prompt 04 nem teste em aparelho físico.
- `npm run dev -- --port 3218` também iniciou e serviu Phoenix com HTTP 200. Ambos os servidores temporários foram encerrados. Para repetir produção: `npm run build` e `npm run start -- --port 3217`; não há processo deixado aberto.

## Referências e assets

Referências somente de leitura, não dependências do aplicativo:

- POC: `C:\Users\User\Downloads\bright-solar\BRIGHTFIELD_WEB_PREP_V01\web-prep\BRIGHTFIELD_WEB_POC_V01`. Foram inspecionados package/lock, README, controles DOM, contrato da cena e inventário de assets; nada foi alterado ou copiado. A POC separa viewer/WebGL e estados visuais; não substitui o contrato financeiro do desafio. Bake/debug continua separado.
- OpenDesign aprovado: ZIP `C:\Users\User\Downloads\Brightfield-Solar-Phoenix-v2 (2).zip`; extraído em `C:\Users\User\Downloads\Brightfield-Solar-Phoenix-v2`. Os 19 arquivos foram comparados byte a byte e são idênticos. Lidos `index.html`, `app.js`, `styles.css`, `DESIGN-HANDOFF.md`, `DESIGN-MANIFEST.json` e fontes.
- O export contém apresentações fixas 1440/390, templates `landing()`/`details()` e frames de estados. Não determina rotas nem comprova drawer/carrossel funcional. Extrair componentes e construir uma página adaptativa, sem molduras, notas ou duplicações; não copiar o handoff genérico como arquitetura.
- Oito PNGs disponíveis em `assets/`: `house-front.png`, `step-assess.png`, `step-plan.png`, `step-install.png`, `crew-ray.png`, `crew-danielle.png`, `crew-okafor.png` e `closing-home.png`. Nenhum foi copiado ou usado nesta fundação.
- Nove referências históricas citadas mas **ausentes na raiz do pacote**: `01_instalacao.jpg`, `02_depoimentos_equipes.jpg`, `03_faq.jpg`, `04_final_luz_escala.jpg`, `05_final_foco_acao.jpg`, `Brightfield_Composicao_B.png`, `Brightfield_Drawer_Estados.png`, `house-front.png` e `phoenix-referencias-residenciais.png`. O `assets/house-front.png` existe e é distinto desse caminho histórico. Não inventar os ausentes nem torná-los dependências.
- Tokens conferidos em `styles.css`: navy `#102B4E`, texto `#244568`, ação `#315C9A`, céu `#EDF4F7`, papel `#FBFCFD`, verde `#557653`, amarelo `#E6BD4F`; ritmo 4/8 e raios 8/12/16. CSS Modules + CSS global pequeno, sem outra stack visual.
- Fontes locais verificadas por tabelas TrueType: IBM Plex Sans normal 400/500/600, copiadas sem alteração e usadas via `next/font/local`, com fallback Arial/sans-serif e `display: swap`. O export não trazia licença textual; foi incluída a [licença OFL 1.1 oficial da IBM](https://github.com/IBM/plex/blob/master/LICENSE.txt) em `src/app/fonts/LICENSE.txt`. Nenhum download de fonte ou request remoto é necessário em build/runtime.

## Componentes WEB 02

O export v2 foi renderizado em navegador real; os oito PNGs foram abertos antes de estilizar. CSS Modules conservam tokens, espaçamentos, tipografia, alternância das etapas, proporções de mídia e nomes das equipes sobre o retrato. Sem autorização comprovada para redistribuir imagens, `MediaPlaceholder` ocupa as mesmas proporções com indicação explícita; não substitui fotos por assets inventados. O CTA usa fundo neutro escuro para manter contraste do texto sobreposto; em até 1024px, o texto fica abaixo da mídia para não colidir.

- `Button`: botão nativo, variantes `primary`/`light`, seta decorativa opcional e props/ref nativos. `Container`: largura máxima 1440px e gutters responsivos. `SectionHeading`: eyebrow, título com id e descrição opcional.
- `Hero`: dados `city`, `sceneSlot` e `controlsSlot`; DOM estático no servidor. O slot da cena preenche a área visual inteira, inclusive atrás da copy; não existe renderer, canvas isolado inferior ou GLB. `headingAs` permite usar h2 na galeria e h1 na futura composição pública.
- `ProcessSteps`: três passos semânticos, mídia alternada no desktop e texto antes da mídia no mobile. `FAQ`: itens de `CityConfig`, disclosure nativo por `details/summary`, estados iniciais `first`/`all`/`none`, sem JS para expandir.
- `SocialProof`: dados de cidade/depoimentos/equipes por props; variante `featured` com cards completos renderizados no servidor e ilha de navegação manual, ou `all` em grade. Nomes, datas, bairros, números, notas e descrições vêm do registro existente; nenhum dado fictício alternativo é criado. Sem autoplay.
- `FinalCTA`: mídia proporcional e `action: ReactNode`; a prévia apresenta botão **visivelmente desativado**, sem simular agendamento.
- `SimDrawer`: `open`, `step` (`bill`/`coverage`/`result`/`edit`), valores string controlados, perfil selecionado, resultado já formatado, avisos e callbacks explícitos. Não importa matemática. Inputs nativos rotulados usam limites oficiais; perfil altera só conta, preservando cobertura. O controlador da prévia conserva valores/passo/seleção ao fechar, devolve foco ao launcher e move foco ao título na abertura/transição. Escape fecha; não é modal, não prende foco ou bloqueia o restante da página.

A galeria demonstra Hero fechado/aberto, quatro passos, avisos de mínimo/teto, perfis, FAQ inicial/expandida e variantes de prova social. Resultados são **fixtures fixas do export**, somente nesta rota: editar inputs não recalcula números. O texto de ajuda e “See how it is calculated” deixam isso explícito. Cada exemplo é isolado, não uma landing pública duplicada.

### Inventário de imagens e permissão

Todos os arquivos abaixo foram fornecidos como referência no export local v2 (`assets/`). A autoria/origem primária — inclusive eventual geração por IA — é **desconhecida**; o pacote/guia não comprova licença de redistribuição. Links históricos de terceiros não autorizam estas imagens. Status de todos: **permissão pendente; não copiados para bundle/public nem usados no app**.

| Arquivo             | Dimensões | Uso no export             | Origem conhecida / classificação                     |
| ------------------- | --------- | ------------------------- | ---------------------------------------------------- |
| `house-front.png`   | 1600×1000 | casa frontal do Hero/cena | Fornecido pelo usuário; origem primária desconhecida |
| `step-assess.png`   | 1448×1086 | avaliação da casa         | Fornecido pelo usuário; origem primária desconhecida |
| `step-plan.png`     | 1448×1086 | planejamento              | Fornecido pelo usuário; origem primária desconhecida |
| `step-install.png`  | 1448×1086 | instalação                | Fornecido pelo usuário; origem primária desconhecida |
| `crew-ray.png`      | 1122×1402 | Ray O. and team           | Fornecido pelo usuário; origem primária desconhecida |
| `crew-danielle.png` | 1122×1402 | Danielle W. and team      | Fornecido pelo usuário; origem primária desconhecida |
| `crew-okafor.png`   | 1122×1402 | The Okafor brothers       | Fornecido pelo usuário; origem primária desconhecida |
| `closing-home.png`  | 1672×941  | casa no CTA final         | Fornecido pelo usuário; origem primária desconhecida |

IBM Plex Sans é a exceção já resolvida: 400/500/600 locais, licença OFL 1.1 em `src/app/fonts/LICENSE.txt`; nenhum CDN.

### QA visual WEB 02

- `npm run check` passou: `format:check`, lint sem avisos, typecheck strict e **41 testes** (39 de dados preservados + 2 de navegação). `npm run build` passou e manteve Phoenix como **SSG**. Sem alteração de versões, scripts, lockfile ou configuração TypeScript.
- Produção local em `127.0.0.1:3229`: Phoenix **200**, um `main`/`h1`, title/description originais no HTML; `/` **307** para `/city/phoenix-az`; slug desconhecido e `/preview/components` **404**. A prévia não entrega seus componentes em produção; 404 real e link de retorno por teclado conferidos no navegador. Prévia exercitada em dev `127.0.0.1:3228`; servidores e abas temporários próprios encerrados.
- Chromium real em **1440, 390, 768 e 1024 CSS px**: sem overflow horizontal; proporções 4:3 e 1122:1402 mantidas, nomes sobre a mídia e CTA sem texto cortado. Não foi feito teste em aparelho físico.
- Exercitados abertura/fechamento por teclado, Escape, retorno de foco, validação nativa de passo, perfil alterando só conta, cobertura/passo/seleção preservados ao reabrir, result/edit e avisos fixos. FAQ responde a Enter/Space; carrossel responde a setas/Home/End e scroll manual, alcança a última seleção nas quatro larguras e a conserva no resize. Sem autoplay ou animação de entrada.
- Corrigidos no smoke: overflow vertical do drawer sobre a copy mobile; seleção incorreta na borda do rail em layouts de dois cards, inclusive arredondamento das medidas. Nenhum erro de execução nas interações finais.
- IBM Plex Sans 400/500/600 carregados localmente, sem recurso remoto. Contrastes medidos: texto/céu **8,88:1**, helper/céu **4,75:1**, metadata do card lateral com opacidade **4,60:1**, branco/CTA escuro **15,10:1**. Isso não substitui auditoria completa de acessibilidade do WEB 04.
- Capturas em [`evidence/web02/desktop-1440.png`](evidence/web02/desktop-1440.png) e [`mobile-390.png`](evidence/web02/mobile-390.png); detalhes: [`hero-open-desktop.png`](evidence/web02/hero-open-desktop.png), [`hero-open-mobile.png`](evidence/web02/hero-open-mobile.png), [`drawer-states-desktop.png`](evidence/web02/drawer-states-desktop.png) e [`final-mobile.png`](evidence/web02/final-mobile.png). O host usa DPR 1,25: as dimensões físicas dos PNGs diferem da largura CSS.

## Fronteiras para os próximos prompts

Adicionar arquivos somente quando usados:

- `app/`: rotas e composição; não concentrar negócio.
- `components/ui/`: visuais OpenDesign e primitivas realmente reutilizadas.
- `features/simulator/`: matemática pura TS, estado da interação e UI separados.
- `features/scene/`: renderer, lifecycle WebGL, assets e adaptação do resultado.
- `domain/cities/`: dados/contrato independentes de React.
- `shared/`: apenas utilidades genuinamente compartilhadas, nunca depósito genérico.

Estado começa com `useState`/`useReducer` na feature. Dados vêm do servidor por props; compartilhar estado pelo ancestral necessário. Sem stores, contextos duplicados, Provider vazio ou AppProviders preventivo; provider cliente apenas por dependência real, no menor trecho possível. Perfil alterando só conta, cobertura preservada e limites nativos dos inputs já estão na prévia WEB 02: conta $40–$600 em passos de $10, cobertura 50%–100% em passos de 5. **WEB 03** implementará e testará a matemática pura, sem React/DOM/WebGL/autenticação: arredondar painéis para cima, respeitar mínimo, limitar economia à conta e excluir incentivo estadual. Um mesmo resultado real será consumido por UI e renderer; fixtures não fazem parte desse cálculo.

Página pública não exige login: sem SDK, usuário fictício, SessionProvider, `/api/auth`, middleware/proxy de sessão, cookies, login ou AuthAdapter vazio. Futura área autenticada terá fronteira própria tipada e autorização no servidor, mantendo página pública e simulador independentes da biblioteca. Extensibilidade é desacoplamento, não infraestrutura antecipada.

Página final: **hero com simulador integrado → processo em três passos → prova social (depoimentos/equipes) → FAQ → CTA final**: seis momentos de leitura, **cinco seções**. Componentes WEB 02 já existem; compor somente em WEB 03. Nunca usar a página como imagem ou substituir por template genérico. Hero com canvas ocupando sua área, texto/controles DOM sobre o céu; conteúdo acessível no servidor. A cena Three.js real do Prompt 05 será integrada após validação; imagem só como poster/fallback, não resultado principal. Resultado financeiro pode chegar a **57 painéis**, cena atual comporta **51**: aviso visual explícito, sem truncar cálculo financeiro.

Entrada visual intencional de aproximadamente 600–800 ms fica para etapa visual, respeitando `prefers-reduced-motion` e sem aguardar todos os assets para mostrar conteúdo útil. UTM/eventos first-party ficam para rodada posterior separada, retomando a POC documentada; geolocalização adiada. Sem coletor ou endpoints agora.

## Limites e sequência

1. **WEB 01 preservado:** fundação, dados e rota mínima, stack/scripts/lockfile inalterados.
2. **WEB 02 atual:** componentes v2 e estados visuais controlados; prévia dev isolada, sem composição final, cálculo, Three.js, autenticação, analytics ou geolocalização. Imagens aguardam confirmação de permissão; referências históricas ausentes não foram inventadas.
3. **WEB 03, não iniciado:** compor a página adaptativa pública, implementar função financeira pura e integrar cena real validada no Prompt 05. Reutilizar contratos e componentes; remover dependência de fixtures da futura experiência pública.
4. **Prompt 04:** responsividade, acessibilidade, desempenho, SEO e documentação final. Domínio de produção, canonical e imagem de compartilhamento estão pendentes; não foram inventados. Publicação só com autorização.

Implementação assistida por IA no OMP; aproveitados dados oficiais, tokens/fontes reais e APIs documentadas, não a POC inteira. Tempo gasto não foi medido. Esta entrega não inclui vídeo, deploy ou a solução visual completa do desafio.
