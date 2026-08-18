---
name: IA com material didático
description: Decisão para apps educacionais que usam LLM com um material de aula como fonte.
---

O material didático deve continuar sendo a fonte de contexto do RAG, enquanto a
credencial do provedor fica somente no backend. Perguntas e diagnósticos devem
ter uma validação estruturada e uma alternativa local alinhada ao material para
que a experiência educacional não fique indisponível durante uma falha
temporária do provedor.

**Why:** O acesso interno ao Gemini pode não ser autorizado em todos os
ambientes, e uma avaliação de aprendizagem precisa continuar testável sem
expor a chave nem inventar conteúdo fora da aula.

**How to apply:** Use a chave via Segredos do Replit, envie ao modelo apenas o
contexto recuperado e valide JSON; mantenha fallback curado e identificável no
backend, nunca no cliente.