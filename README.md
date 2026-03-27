# GestorADM - Plataforma de Gestão de Equipes

Este é um projeto de gestão administrativa desenvolvido com **React**, **Vite** e **Firebase**. Ele inclui funcionalidades de Dashboard, Kanban de Tarefas, Gestão de Equipes, Projetos e Check-ins.

## Tecnologias Utilizadas

- **Frontend**: React.js com Vite
- **Estilização**: CSS Vanilla (focado em um design moderno e responsivo)
- **Ícones**: Lucide React
- **Backend/Database**: Firebase (Authentication e Firestore)
- **Roteamento**: React Router DOM

## Como Rodar o Projeto

1. **Pré-requisitos**: Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
2. **Instalação**: No terminal, dentro da pasta do projeto, execute:
   ```bash
   npm install
   ```
3. **Execução**: Para iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. **Acesso**: O projeto estará disponível em `http://localhost:5173`.

## Configuração do Firebase

O projeto já vem configurado com uma instância de demonstração no Firebase (projeto `smartlab-39b9d`). 

- **Autenticação**: Suporta login via Google.
- **Banco de Dados**: Utiliza Firestore para persistência de dados.
- **Modo de Demonstração**: Existe um botão para entrar como Administrador sem necessidade de login real para facilitar testes rápidos.

## Estrutura de Pastas

- `src/views/`: Contém as páginas principais (Dashboard, Tasks, Teams, etc).
- `src/firebase.js`: Configurações de conexão com o Firebase.
- `src/App.jsx`: Roteamento e lógica principal de autenticação.
- `src/index.css`: Sistema de design (tokens de cores, glassmorphism, etc).

## Feedback

Este projeto foi gerado e está sendo desenvolvido com o auxílio do **Antigravity**. Sinta-se à vontade para analisar o código e deixar sua opinião!

