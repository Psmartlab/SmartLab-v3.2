# Como Compartilhar seu Projeto

Para enviar o projeto para o seu amigo desenvolvedor, você não precisa de um único "script", mas sim da pasta do projeto (exceto os arquivos pesados que ele mesmo pode baixar).

Aqui está o passo a passo de como fazer isso no Windows:

### 1. Preparar a Pasta
Vá até a pasta onde o projeto está salvo:
`c:\Users\henri\OneDrive\Projetos SW\Antigravity\GestorADM`

### 2. O que NÃO enviar (Importante!)
**NÃO** envie a pasta chamada `node_modules`. Ela é muito pesada e seu amigo pode gerá-la automaticamente. 
- Se você enviar essa pasta, o arquivo ficará lento para carregar e enviar.

### 3. Como Compactar (ZIP)
1. Clique com o botão direito na pasta **GestorADM** (ou selecione todos os arquivos dentro dela, exceto `node_modules`).
2. Escolha **"Enviar para"** > **"Pasta compactada (zipada)"**.
3. O Windows criará um arquivo chamado `GestorADM.zip`.

### 4. O que seu amigo deve fazer
Eu já atualizei o arquivo `README.md` dentro do projeto com instruções técnicas para ele. Basicamente, ele só precisará:
1. Descompactar o arquivo.
2. Abrir um terminal na pasta.
3. Digitar `npm install` (isso vai baixar as dependências automaticamente).
4. Digitar `npm run dev` para ver o programa rodando.

---
**Dica**: Se você usa GitHub, o ideal seria subir o código para lá e mandar o link. Se quiser ajuda para fazer isso, é só me pedir!
