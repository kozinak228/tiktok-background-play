# 🎵 TikTok Background Play & PiP

Браузерное расширение, которое позволяет смотреть TikTok в фоновом режиме и в плавающем окне (Picture-in-Picture).

![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen?logo=googlechrome&logoColor=white)
![Opera](https://img.shields.io/badge/Opera-supported-brightgreen?logo=opera&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-supported-brightgreen?logo=microsoftedge&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## ❓ Проблема

При переключении вкладки TikTok ставит видео на паузу и звук пропадает. Это расширение решает эту проблему.

## ✨ Возможности

| Функция | Описание |
|---------|----------|
| 🔇 **Фоновое воспроизведение** | Видео продолжает играть при переключении вкладки |
| 🖼️ **Picture-in-Picture** | Маленькое плавающее окно поверх всех окон |
| ⌨️ **Горячая клавиша** | `Alt + P` — быстрое включение/выключение PiP |
| 🔄 **Авто-возобновление** | Автоматический restart видео если TikTok поставит на паузу |

## 📦 Установка

1. Скачайте или клонируйте этот репозиторий:
   ```bash
   git clone https://github.com/kozinak228/tiktok-background-play.git
   ```
2. Откройте браузер и перейдите на страницу расширений:
   - **Chrome:** `chrome://extensions/`
   - **Opera:** `opera://extensions/`
   - **Edge:** `edge://extensions/`
3. Включите **Режим разработчика** (переключатель в правом верхнем углу)
4. Нажмите **«Загрузить распакованное расширение»**
5. Выберите скачанную папку

## 🚀 Использование

### Фоновое воспроизведение
Работает **автоматически** — просто откройте TikTok и переключитесь на другую вкладку. Звук не пропадёт.

### Picture-in-Picture (плавающее окно)
- Нажмите круглую кнопку в **правом нижнем углу** на странице TikTok
- Или используйте горячую клавишу **`Alt + P`**
- Окно можно перетаскивать и менять его размер
- Повторное нажатие закрывает PiP

## 🛠️ Как это работает

- **`inject.js`** — перехватывает Page Visibility API до загрузки скриптов TikTok, чтобы сайт не узнал о смене вкладки
- **`content.js`** — добавляет кнопку PiP и механизм авто-возобновления видео
- **`content.css`** — стили кнопки и уведомлений

## 📄 Лицензия

MIT License — используйте свободно.
