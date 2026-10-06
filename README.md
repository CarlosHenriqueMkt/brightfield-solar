# Brightfield Solar — Caso 09

WEB 03: landing adaptativa de Phoenix, cálculo financeiro real e cena `finished-v04`, preservando a fundação WEB 01 e os componentes WEB 02 do [caso 09 da Alvorada](https://github.com/Alvorada-Dev/desafios-tecnicos/blob/main/casos/09-pagina-de-cidade.md). Empresa, números, incentivos, equipes e depoimentos são fictícios; não são orientação tributária atual. Branch de implementação `feat/web03-finished-v04`. Sem deploy nesta etapa.

## Executar

Node **24.12.0+ na linha 24**, npm **11.16.0+ na linha 11**. Não exige ferramentas globais, segredos nem os arquivos de referência em Downloads.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000/city/phoenix-az**. Os scripts vinculam somente loopback; encerre com Ctrl+C. Produção local:

```sh
npm run check
npm run build
npm run start
```

`check` executa `format:check`, lint sem tolerância a avisos, `next typegen && tsc --noEmit` e Vitest. `build` é separado. `format` aplica Prettier; `test:watch` mantém Vitest em modo watch. Scripts e configurações de qualidade existentes foram preservados: TypeScript strict, `skipLibCheck: false`, sem ignorar erros de build. `.next/dev` permanece excluído para não duplicar tipos gerados por `next typegen`.

Versões exatas no único `package-lock.json`: Next **16.3.8**, React/React DOM **19.3.0**, TypeScript **6.0.3**, ESLint **10.12.0**, Prettier **3.9.9**, Vitest **5.0.3**. WEB 03 acrescenta apenas **three 0.186.1** e **@types/three 0.186.0**. IBM Plex Sans 400/500/600 continua local via `next/font/local`, sem CDN.

## Página, rotas e fronteiras

- `/` retorna **307** para `/city/phoenix-az`; Phoenix é **SSG** com `generateStaticParams`. Só esse slug está cadastrado; outros retornam **404**.
- A composição pública no servidor é **Hero/simulador → três etapas → depoimentos/equipes → FAQ → CTA final**. Título, descrição, um `h1`, dados e conteúdo útil chegam no HTML. FAQ usa `details/summary`; depoimentos têm navegação manual, sem autoplay.
- `/preview/components` conserva exemplos isolados e fixtures WEB 02, explicitamente demonstrativas. `/preview/scene` oferece calibração e inspeção técnica. Ambas retornam **200 + robots `noindex, nofollow` em desenvolvimento** e **404 em produção**; não há link público para elas.
- `src/app/city/[citySlug]/page.tsx` compõe componentes de `src/components/sections`; `domain/cities` mantém contrato, validação e registro independentes de React.
- `features/simulator/finance.ts` contém matemática pura; `simulation-state.ts`, o reducer; `SimulatorHero.tsx`, interação/foco; `SimDrawer`, apresentação controlada. Um único controlador atende todos os CTAs públicos, sem duplicar simuladores.
- `features/scene` contém viewer, cache/lifecycle, validadores de manifest/hierarquia, estados solares, presets e trajetória. O servidor entrega o poster; só a cena WebGL é carregada como ilha cliente. Não há renderer ou handle de debug no servidor; o handle técnico no DOM é exclusivo de desenvolvimento.
- Sem backend, autenticação, stores globais, localStorage, geolocalização, analytics, endpoints ou infraestrutura preventiva. Canonical/domínio de produção não foram inventados.

## Contrato financeiro

Conta **$40–$600**, passo **$10**; cobertura **50%–100%**, passo **5%**; início **$220 / 80%**. Perfis alteram somente a conta. Campos inválidos, inclusive vazios, conservam o último cálculo válido e a intenção da cena, mostram a política de validação e não produzem `NaN`. Valores financeiros atualizam imediatamente; somente o anúncio acessível é moderado em 600 ms.

Para Phoenix:

1. Consumo mensal = conta / **$0,15/kWh**.
2. Geração por painel = **0,45 kW × 6,5 h/dia × 30 dias × 0,8 = 70,2 kWh/mês**.
3. Painéis = máximo entre **8** e o teto do consumo-alvo dividido pela geração unitária. Cobertura não é alterada para acomodar o mínimo.
4. Investimento bruto = painéis × **450 W × $2,75/W**; líquido = bruto × **70%**, após crédito federal de 30%.
5. Economia = mínimo entre conta e valor da geração. Excedente vira crédito com Arizona Public Service, não receita em dinheiro. Payback = investimento líquido / (12 × economia mensal).

Não há arredondamento intermediário; formatação monetária e anos de payback pertencem à UI. O incentivo estadual de **25%, limitado a $1.000**, é informado, mas **não entra no investimento líquido ou payback**. O tratamento de teto considera a precisão de ponto flutuante na fronteira de um inteiro, sem arredondar consumo/geração previamente.

| Conta / cobertura | Financeiro |                  Visual |
| ----------------- | ---------: | ----------------------: |
| $220 / 80%        |         17 |                      17 |
| $90 / 100%        |          9 |                       9 |
| $90 / 80%         |          8 |    8, cobertura mantida |
| $600 / 100%       |         57 | 51, com aviso explícito |

O domínio não limita o cálculo a 51. Uma matriz independente cobre todas as **627 combinações** válidas; oito casos foram também exercitados na UI real, além de perfil preservando cobertura e campo vazio preservando os números anteriores.

## Hero, interação e cena

Canvas, poster e Hero têm **o mesmo retângulo full-bleed**. Aspect usa medidas reais do host e `ResizeObserver`; DPR efetivo é limitado a **1,5**. A copy permanece no DOM/fluxo e é ocultada durante simulação e retorno: a altura não muda ao abrir/fechar. Posters desktop **1440×820** e mobile **390×780** são capturas genuínas de `CASA_BASE`, não fotos substituindo o resultado 3D.

Desktop é não modal. Até 700 CSS px, o painel é um diálogo modal real: foco contido, Tab/Shift+Tab circular, fundo inerte, Escape e bloqueio/limpeza de scroll. Antes de ocultar o painel, o foco sai para um alvo não inerte; ao voltar à casa frontal, retorna ao CTA. **View house** remove o painel sem fechar a simulação, preserva valores/placas/câmera elevada; **Back to simulation** restaura o passo. Os controles móveis medidos têm altura mínima de 44 px.

A cena inicia em `CASA_BASE`, inclusive no primeiro quadro de uma carga fria. O viewer recebe sempre a intenção mais recente: abrir/editar/fechar antes do GLB terminar não dispara uma viagem antiga. Falha de rede ou contexto mostra poster e **Retry 3D house**, sem bloquear o cálculo. Retry é manual; restauração usa a intenção financeira atual.

- **207 nós originais + 3 de ambiente = 210**, **51 painéis**, identificação por `asset_id`. Não há cama hexagonal recriada, montagem alternativa, materialKit ou assets históricos em runtime.
- Materiais baked/unlit, saída **sRGB**, **NoToneMapping**, exposição **1**, sem luzes, sombras ou fog; céu JPG com yaw zero. Transformações e presets artísticos aprovados são preservados.
- Viagem completa em ambos os sentidos: **4 segundos**, `easeInOutCubic`, trajetória orbital, partindo da pose efetivamente atual. Inversão/resize retargetam de forma proporcional, até quatro segundos; não há salto para o endpoint antigo nem repetição de uma chegada já concluída. Revisões rejeitam callbacks obsoletos.
- Módulo e suporte são agrupados apenas em wrapper transitório. Tween de **150 ms** e stagger `min(40 ms, 1300 ms / max(1, N − 1))`: até **1.450 ms nominais** com 51 placas. Quadro final medido em **1.462,9 ms**; com resize real 1024→768→1024, **1.464 ms**. O relógio próprio dos painéis não reinicia com o retarget da câmera.
- Reconciliação preserva progresso real e não encolhe uma placa parcialmente revelada. Ao estabilizar, todos os wrappers somem e pais, ordem dos filhos e TRS originais são restaurados; módulo e suporte não viram nós independentes na raiz.
- Fora da tela ou com documento oculto, relógios/RAF pausam. Retomada não inclui o tempo oculto. Cena estável não mantém RAF. Movimento reduzido conclui uma vez, sem loop de animação.

A GUI técnica permite editar/aplicar pose, escolher presets, usar pose atual, restaurar aprovado, scrub/play/pause, duração/easing/trajetória, estados solares e copiar/exportar JSON. A edição de draft foi exercitada enquanto o playback realmente avançava; 102 registros de módulo/suporte foram inspecionados, com pais corretos e TRS local identidade.

## Assets, autorização e licenças

Referências de leitura: OpenDesign v2 extraído em `C:\Users\User\Downloads\Brightfield-Solar-Phoenix-v2`; POC em `C:\Users\User\Downloads\bright-solar\BRIGHTFIELD_WEB_PREP_V01\web-prep\BRIGHTFIELD_WEB_POC_V01`; contrato `CONTRATO_WEB03_FINISHED_V04.txt` fornecido com o finished-v04. O aplicativo não depende desses caminhos.

Carlos Henrique autorizou nesta sessão o uso/cópia dos **oito PNGs fornecidos** em `public/assets/approved-v2`: `house-front`, `step-assess`, `step-plan`, `step-install`, `crew-ray`, `crew-danielle`, `crew-okafor`, `closing-home`. Todos foram comparados por SHA-256 com a origem e estão byte a byte idênticos. `house-front` continua na galeria de componentes; o Hero público usa a cena e seus posters. Etapas/equipes usam as fotos fornecidas, e o CTA final conserva a imagem blue-hour. Autoria/origem primária, inclusive eventual geração por IA, é desconhecida; não são declarados CC0 nem receberam créditos inventados.

IBM Plex tem [OFL 1.1 oficial](https://github.com/IBM/plex/blob/master/LICENSE.txt), preservada em `src/app/fonts/LICENSE.txt`. A proveniência CC0 dos materiais/sky Poly Haven está em [`licenses/finished-v04/CC0-1.0-NOTICE.txt`](licenses/finished-v04/CC0-1.0-NOTICE.txt), com autores/URLs de White Stucco, Granular Concrete, Gravel Floor e Kloofendal 48d Partly Cloudy Pure Sky. [Política Poly Haven](https://polyhaven.com/license) e [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Isso não atribui CC0 a toda a geometria do projeto, aos PNGs ou ao aplicativo. O resize técnico 2K do céu é registrado no manifest; não houve re-bake, Blender ou alteração artística.

Somente estes três arquivos do finished-v04 são servidos como assets 3D:

| Arquivo               |     Bytes | SHA-256 de origem/destino/HTTP                                     |
| --------------------- | --------: | ------------------------------------------------------------------ |
| `house.glb`           | 1.865.736 | `20cdc8f8ede8396227c5c7f4f38ab1e5f95d9dfe0ea22d28072d9bd62600b7c3` |
| `house.manifest.json` |   881.999 | `8ef5a7a184855aab05b1aeb5c2b51ff30aa4b1e00e28ddf51f5dc06f969e8d7d` |
| `sky-softened-2k.jpg` |   118.806 | `afd97440b1fbcbf98c534a8a269a2ccba525e75396c49c84d051b4e9ee6e3f12` |

Total bruto 3D: **2.866.541 bytes**, abaixo de 3 MB decimais. `.prettierignore` exclui somente esse manifest imutável para preservar bytes/hash; não ignora código ou validação. As oito fotos somam **16.445.531 bytes brutos**; os dois posters, **800.089 bytes**. São orçamentos separados, não uma alegação de que a página inteira, RAM ou VRAM cabe em 3 MB.

### Tráfego e memória observados

Produção, viewport 1440×900, cache desativado apenas nessa página, navegação fria e scroll real até carregar as sete fotos públicas:

| Grupo                        | Corpo HTTP codificado | Corpo após descompressão HTTP |
| ---------------------------- | --------------------: | ----------------------------: |
| HTML                         |                 8.950 |                        56.238 |
| JavaScript, 11 requests      |               317.389 |                     1.167.328 |
| CSS, 3 requests              |                 5.536 |                        25.312 |
| Fontes locais, 3 requests    |               326.595 |                       615.828 |
| Fotos otimizadas, 7 requests |               465.266 |                       465.266 |
| Poster selecionado           |                16.358 |                        16.358 |
| Finished-v04, 3 requests     |             1.563.012 |                     2.866.541 |
| **Total**                    |         **2.703.106** |                 **5.212.871** |

`ResourceTiming.transferSize` reportou **2.711.806 bytes** incluindo sua estimativa de overhead, sem requests de terceiros. Não é medição de pacotes/TLS nem garantia para todo viewport/formato. “Descompressão HTTP” não é decodificação de pixels.

Buffers CPU únicos de índices/atributos da geometria: **469.568 bytes**, não RAM total. Imagens de materiais: 1024², 2048² e 512²; céu 2048×1024. Contagem da cena: **148 meshes / 48 geometrias / 3 materiais / 3 texturas**. GPU aquecida: **49 geometrias / 5 texturas**, incluindo recursos internos do renderer; estável nas restaurações repetidas. Contagens não são VRAM em bytes e não incluem todo o custo de framebuffer, mipmaps, multisampling ou decodificação.

## Verificação e evidências

`npm run check` e `npm run build` passaram: formatação, lint sem avisos, TypeScript strict, contratos puros e Phoenix SSG. O cenário real, e não uma suíte WebGL simulada, verificou:

- HTTP público/307/404, metadata e cinco títulos de seção no HTML; previews protegidas em produção e `noindex, nofollow` no HTML dev.
- **1440×900, 1920×1080, 390×844, 470×815**, além de resize 768/1024: mesmo retângulo Hero/canvas/poster, altura preservada entre modos, um `h1`, sem overflow horizontal. Desktop não modal; mobile com foco, teclado, casa/voltar, Escape e cleanup.
- Cálculo imediato, perfil preservando cobertura, mínimo/cap/excedente/57 financeiro versus 51 visual e campo vazio conservando números válidos.
- Ida/volta, inversão durante percurso e resize a partir da pose atual; 210 matrizes/pais/filhos após roundtrip sem divergência; wrappers zero ao estabilizar; progressão parcial sem regressão de escala.
- GLB atrasado com abrir/editar/fechar antes do ready; primeiro quadro base sem viagem antiga. GLB abortado, edição no fallback e Retry recuperando 33 placas, não o default. Perda/restauração real de contexto, atualização da conta enquanto perdido e três ciclos sem crescimento dos recursos aquecidos.
- Dispose manual durante fetch pendente: renderer/canvas/observers liberados, refs zero e nenhum callback da geração antiga após completar. Esse caso não é apresentado como prova de unmount React.
- Offscreen real congela RAF; documento oculto testado por evento/getter controlado; movimento reduzido e DPR cap/ownership entre dois viewers.
- Calibração real durante playback, estados solares, hierarquia e JSON copiado válido.

Evidência detalhada: [`acceptance.json`](evidence/web03/acceptance.json), [`calibration-qa.json`](evidence/web03/calibration-qa.json), [`failure-recovery-qa.json`](evidence/web03/failure-recovery-qa.json). Capturas completas: [1440](evidence/web03/final-page-desktop-1440.png), [1920](evidence/web03/final-page-desktop-1920.png), [390](evidence/web03/final-page-mobile-390.png), [470](evidence/web03/final-page-mobile-470.png); estados fechado/aberto/casa e referências nativas 1440/390 estão no mesmo diretório. A prévia OpenDesign contém boards fixos; 1920/470 verificam a adaptação, não um baseline original inexistente.

### Limites da evidência

Chromium em desktop, DPR real **1,25**, sem aparelho físico/Safari. DPR 3 foi simulado no getter para provar o cap de 1,5. O harness mantém `document.hidden=false` entre abas; o caminho de visibilidade foi exercitado com getter/evento controlado, não certificado como background físico. Download JSON por blob foi clicado, mas a lista de downloads do harness ficou vazia: conteúdo copiado/schema foram verificados; gravação física desse download não foi comprovada. Recorte móvel dos presets aprovados foi preservado, sem recalibração artística para fingir equivalência pixel a pixel com a foto do export. Estas observações não substituem a auditoria final de acessibilidade/performance/SEO em aparelhos reais do WEB 04.

## Histórico da entrega

- **WEB 01:** fundação, qualidade, fontes locais, registro Phoenix e rota mínima verificável.
- **WEB 02:** componentes reutilizáveis, tokens/CSS Modules, galeria dev e estados controlados; evidências históricas permanecem em `evidence/web02`.
- **WEB 03:** composição pública completa, cálculo puro, controlador único, modal móvel, finished-v04, posters genuínos, imagens autorizadas, GUI/lifecycle e provas reais. Placeholders e caminhos obsoletos de mídia foram removidos; fixtures continuam somente na galeria dev.

Implementação assistida por IA no OMP. Tempo de trabalho não foi medido. Sem vídeo ou deploy nesta etapa.
