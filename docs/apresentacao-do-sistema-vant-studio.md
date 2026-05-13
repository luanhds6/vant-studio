# Vant Studio — roteiro para apresentação

*Documento curto para ler em voz alta ou projetar como tópicos. Duração sugerida: 5–8 minutos. Detalhe técnico completo: `visao-geral-e-funcionalidades.md`.*

---

## 1. Abertura — o que é

- O **Vant Studio** (*Catálogo Digital*) é uma aplicação web para empresas que precisam de **catálogos profissionais** com **fichas de produto completas** e **PDF pronto a enviar ou imprimir**.
- Os dados ficam **na nuvem**, com login seguro — não é uma folha de cálculo partilhada, é um **sistema dedicado**.

---

## 2. Problema que resolve

- **Desorganização:** produtos espalhados por ficheiros e e-mails.
- **Inconsistência:** cada PDF com um formato diferente.
- **Escala:** várias **unidades** (hospitais / filiais) com catálogos separados mas na mesma plataforma.

**Mensagem-chave:** uma só fonte de verdade, catálogo alinhado com a **marca** da empresa.

---

## 3. Pilares da solução (o que mostrar no demo)

| Pilar | O que dizer em uma frase |
|--------|---------------------------|
| **Unidades** | Cada *hospital* agrupa os seus produtos; na página inicial abrimos a unidade e vamos diretos ao **catálogo/PDF** quando o perfil permite. |
| **Produto** | Ficha rica: medidas, tecido, cores, fotos, blocos técnicos, referência — tudo o que o comercial e a produção precisam numa página. |
| **PDF** | Escolhemos produtos, **retrato ou paisagem**, pré-visualizamos e **exportamos** A4 com logo e dados da empresa. |
| **Cores / tecido** | **Paleta global** com indústria e tipo de tecido, reutilizável nos produtos e refletida no layout do catálogo. |
| **Contratos** *(se o público for administração)* | Modelos em PDF, **link para assinar** sem login, carimbo na última página; acompanhamento na área interna. |

---

## 4. Quem acede ao quê (sem entrar em TI)

- **Administrador:** vê tudo — utilizadores, configurações, contratos, produtos, catálogo.
- **Equipa de campo / comercial:** pode só **gerar catálogo** ou também **criar e editar produtos**, conforme o que o admin marcou.
- **Primeiro acesso:** se a conta foi criada com senha temporária, o sistema **obriga** a definir uma nova senha antes de continuar — boa prática de segurança.

*(Opcional para audiência técnica: permissões nomeadas no código — página inicial, gerar catálogo, novo produto, produtos, configurações, utilizadores.)*

---

## 5. Tecnologia (slide opcional — “porque confiar”)

- Interface moderna e rápida (**React** + **Vite**).
- Base de dados e ficheiros na **Supabase** (Postgres + armazenamento + tempo real onde aplicável).
- **PDF** gerado no browser a partir do mesmo layout que o utilizador vê — o que vê é o que sai.

---

## 6. Fecho — proposta de valor

- **Menos retrabalho:** um fluxo do cadastro ao PDF.
- **Marca consistente:** logo, nome e slogan da empresa no catálogo.
- **Crescimento:** mais unidades e mais produtos sem perder o controlo.
- **Extensível:** módulo de **contratos** para processos que hoje ainda são papel ou e-mail solto.

---

## Perguntas frequentes rápidas (bateria de respostas)

1. **“Preciso de instalar algo?”** — Não para os utilizadores finais: é **web**; quem mantém o projeto usa o código-fonte e o ambiente Supabase configurado.
2. **“Funciona no telemóvel?”** — A interface é **responsiva**; o fluxo pesado é sobretudo **desktop** (PDF e assinatura de contratos).
3. **“Onde ficam os ficheiros?”** — Na cloud (Supabase Storage), com acesso controlado por autenticação nas áreas internas; links de assinatura de contrato são **públicos só para aquele pedido**.

---

*Boa apresentação.*
