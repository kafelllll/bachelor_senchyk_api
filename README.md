# Plantch

## Назва та тема роботи
- **Назва проєкту:** plantmatch-api
- **Тема роботи:** Вебплатформа для онлайн-обміну рослинами з функцією автоматичного підбору відповідностей.

## Автор
Сенчик Анастасія Романівна, 4CS-43

## Науковий керівник
Яковлєв Микола Костянтинович, Senior Engineer, Intellias

## Короткий опис проєкту
Це серверна частина MVP вебплатформи для обміну рослинами. Backend реалізує:
- аутентифікацію та керування профілем;
- CRUD оголошень;
- алгоритм підбору відповідностей;
- обміни, повідомлення, рейтинги та trust-логіку;
- інтеграції з Plant.id, PlantNet, DeepL та S3 presigned upload URL.

## Технології
- Node.js
- TypeScript
- Express
- Prisma + PostgreSQL
- Jest + Supertest
- Postman/Newman

## Інструкція зі встановлення та запуску

### 1. Передумови
Встановити:
- Node.js 20+ (LTS)
- npm 10+
- PostgreSQL 14+

### 2. Клонування та встановлення залежностей
```bash
git clone <URL_репозиторію>
cd plantmatch-api
npm install
```

### 3. Налаштування змінних середовища (без секретів у репозиторії)
1. Скопіювати шаблон локального середовища:
```bash
cp .env.example .env
```
(на Windows PowerShell: `Copy-Item .env.example .env`)

2. Заповнити значення у `.env` (ключі, паролі, URL, SMTP, AWS).

3. Для тестів створити `.env.test` із шаблону:
```bash
cp .env.test.example .env.test
```
(на Windows PowerShell: `Copy-Item .env.test.example .env.test`)

### 4. Підготовка бази даних
```bash
npx prisma db push
```

### 5. Запуск backend
```bash
npm run dev
```
Сервер за замовчуванням стартує на:
- `http://localhost:3000`

### 6. Запуск тестів
```bash
npm run test:unit
npm run test:integration
npm run test:functional
npm run test:coverage
npm test
```

Примітка:
- `test:integration` і `test:coverage` автоматично готують test DB і синхронізують схему (`prisma db push`).

