# pixi-skia-app

Тестовое задание: одна и та же `PIXI.Container` отрисовывается на двух
независимых канвасах параллельно — слева через `pixi.js-legacy` в режиме
`forceCanvas`, справа через кастомную обёртку поверх Google CanvasKit (Skia
WASM). На той же сцене работают события `pointerdown` / `pointerup` через
общий `EventEmitter` каждого `DisplayObject`, а сам Skia-канвас умеет
экспортировать сцену в **векторный PDF** (через `SkPDF`-бэкенд).

---

## Соответствие ТЗ

| Пункт ТЗ                                                  | Где реализовано                                                                                                                                       | Статус |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1. Обёртка Skia принимает `PIXI.Container`                | [src/skia/renderPixiToSkia.ts](src/skia/renderPixiToSkia.ts) — обходит дерево, применяет `localTransform`                                              | OK     |
| 1. Поддержка `translate` / `rotate` / `scale`             | [src/skia/renderPixiToSkia.ts](src/skia/renderPixiToSkia.ts) — `canvas.concat([a, c, tx, b, d, ty, 0, 0, 1])` из `transform.localTransform`           | OK     |
| 1. `PIXI.Graphics` — `drawShape` / `moveTo` / `lineTo` / `drawRect` | [src/skia/graphicsToSkia.ts](src/skia/graphicsToSkia.ts) — `RECT`, `ELIP`, `CIRC`, `RREC`, `POLY` → `SkPath` + `Paint` (fill + stroke)         | OK     |
| 1. `PIXI.Sprite` (PNG)                                    | [src/skia/spriteToSkia.ts](src/skia/spriteToSkia.ts) — `MakeImageFromCanvasImageSource` + `drawImageRect`, учитывает `anchor`                          | OK     |
| 2. Экспорт в PDF через Skia PDF backend                   | [src/skia/pdfExport.ts](src/skia/pdfExport.ts) — `CK.MakePDFDocument(...)` + `beginPage` / `endPage`, использует тот же `renderPixiToSkia`             | OK     |
| 2. Векторный результат (Sprite — допустимое исключение)   | Графика пишется в PDF как векторные пути; `PIXI.Sprite` встраивается как JPEG-битмап (исключение, разрешённое ТЗ)                                     | OK     |
| 2. Кастомная WASM-сборка CanvasKit                        | [skia-build/README.md](skia-build/README.md) — рецепт сборки с `skia_enable_pdf=true` + JPEG callbacks (`SkPDF::JPEG::MetadataWithCallbacks()`)        | OK     |
| 3. `pointerDown` / `pointerUp` на обоих канвасах          | Pixi — нативный interaction manager; Skia — [src/canvas/Skia/Skia.tsx](src/canvas/Skia/Skia.tsx) ловит `pointerdown` / `pointerup` и зовёт `target.emit(...)` через общий `EventEmitter` | OK     |
| 3. Кнопка «Сгенерировать случайную фигуру/линию»          | [src/App.tsx](src/App.tsx) → [src/scene/randomShape.ts](src/scene/randomShape.ts) — `rect` / `ellipse` / `circle` / `line` / `sprite`                  | OK     |
| Тех. требования — TypeScript                              | Весь проект на TS, `tsc -b` в `npm run build` без ошибок                                                                                              | OK     |
| Тех. требования — `pixi.js-legacy@7.2.4`, `forceCanvas: true` | [package.json](package.json) + [src/canvas/Pixi/Pixi.tsx](src/canvas/Pixi/Pixi.tsx) (`new PIXI.Application({ forceCanvas: true })`)                | OK     |
| Тех. требования — модульная архитектура + комментарии     | Skia-обёртка разнесена на 4 фокусных модуля, в спорных местах оставлены WHY-комментарии                                                               | OK     |
| Доп. — простой UI (кнопки, просмотр сцены, экспорт)       | Два `<Card>` со сценами + две кнопки управления; раскладка адаптивная, без сторонних UI-библиотек                                                     | OK     |
| Доп. — запуск через `npm run`                             | См. раздел [Быстрый старт](#быстрый-старт)                                                                                                            | OK     |

---

## Быстрый старт

Требования: Node.js 20+ и npm 10+.

```bash
git clone <repo-url>
cd pixi-skia-app
npm install
npm run dev          # http://localhost:5173
```

Готовая кастомная сборка CanvasKit (с PDF и JPEG) уже лежит в
[public/canvaskit.js](public/canvaskit.js) и [public/canvaskit.wasm](public/canvaskit.wasm),
ничего дополнительно собирать **не нужно**. Если вы хотите пересобрать WASM
из исходников Skia — см. [skia-build/README.md](skia-build/README.md).

| Команда             | Что делает                                                          |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Vite dev-сервер с HMR.                                              |
| `npm run build`     | Тайп-чек (`tsc -b`) + продакшен-бандл в `dist/`.                    |
| `npm run preview`   | Локальный просмотр прод-сборки.                                     |
| `npm run lint`      | ESLint по `src/`.                                                   |

---

## Структура проекта

```
pixi-skia-app/
├── public/
│   ├── canvaskit.js          # кастомная сборка CanvasKit (PDF + JPEG)
│   ├── canvaskit.wasm
│   └── sprite.png            # демо-PNG для PIXI.Sprite
├── skia-build/
│   ├── README.md             # рецепт сборки CanvasKit с PDF-бэкендом
│   └── skia/                 # исходники Skia (git checkout)
├── src/
│   ├── App.tsx               # владеет сценой (PIXI.Container) и sceneVersion
│   ├── canvas/
│   │   ├── Pixi/Pixi.tsx     # монтирует PIXI.Application, attach контейнера
│   │   └── Skia/Skia.tsx     # монтирует <canvas>, CanvasKit, хит-тест событий
│   ├── scene/
│   │   └── randomShape.ts    # фабрика случайных фигур / линий / Sprite
│   ├── skia/                 # ── собственно обёртка над CanvasKit ──
│   │   ├── canvasKit.ts          # мемоизированный загрузчик CK + surface
│   │   ├── renderPixiToSkia.ts   # рекурсивный walker, применяет transform
│   │   ├── graphicsToSkia.ts     # PIXI.Graphics → SkPath + Paint
│   │   ├── spriteToSkia.ts       # PIXI.Sprite → drawImageRect
│   │   ├── paintHelpers.ts       # мапперы Pixi → CanvasKit enum'ов
│   │   ├── hitTest.ts            # global → local + containsPoint, обход z-order
│   │   └── pdfExport.ts          # рендер сцены в SkPDFDocument + скачивание
│   └── ui/Card/Card.tsx      # обёртка-карточка для каждого канваса
└── package.json
```

---

## Архитектура

### Жизненный цикл сцены

`App.tsx` владеет сценой как обычным React-state:

1. На маунте `PIXI.Assets.load("/sprite.png")` подгружает текстуру для
   спрайта (кэшируется по URL).
2. После того как текстура готова, в `useEffect` собирается
   `PIXI.Container` со всеми демо-объектами и кладётся в `setContainer(c)`.
   Контейнер пересоздаётся при каждом цикле эффекта и гарантированно
   уничтожается в cleanup — это устойчиво к StrictMode-ремаунтам.
3. Тот же `container` передаётся в `<Pixi />` и `<Skia />`. Pixi
   автоматически перерисовывает его на каждом тикере; Skia
   перерисовывает по триггеру `sceneVersion` (бампается при добавлении
   новых фигур).

### Обёртка Skia (`src/skia/`)

Обёртка разделена на четыре фокусных модуля, каждый отвечает за одно
дело — это и есть «модульная архитектура» из требований ТЗ:

- **`renderPixiToSkia.ts`** — публичная точка входа. Тонкий рекурсивный
  walker: на каждый узел читает `transform.localTransform`, конкатенирует
  его в текущую матрицу CanvasKit (`canvas.concat`), диспатчит на нужный
  «рисователь» по `instanceof`, и обходит детей. Save/restore матрицы
  через `canvas.save()` / `canvas.restore()`. `Container` рисуется только
  своими детьми — это совпадает с поведением Pixi.
- **`graphicsToSkia.ts`** — превращает `PIXI.Graphics` в `SkPath` +
  `Paint`. Поддержаны все `SHAPES.*` из Pixi 7: `RECT`, `ELIP`, `CIRC`,
  `RREC`, `POLY`. Fill рисуется до stroke — это сохраняет порядок,
  ожидаемый от Pixi, если на одной фигуре есть и заливка, и обводка.
- **`spriteToSkia.ts`** — `PIXI.Sprite` → битмап через
  `MakeImageFromCanvasImageSource` (`baseTexture.resource.source`). Учёт
  `anchor` (нормированное 0..1 от верхнего-левого) — это сдвиг
  `-anchor * size`, чтобы поворот / scale крутили спрайт вокруг той же
  опорной точки, что и в Pixi.
- **`paintHelpers.ts`** — мапперы Pixi-енумов (`LINE_CAP`, `LINE_JOIN`,
  hex-цвет) в `CanvasKit`-енумы и `Color4f`.

### Трансформации

Pixi уже композирует `pivot / scale / rotation / position / skew` в
готовую матрицу `transform.localTransform` (обновляется на каждом
тикере). Мы её и берём — никакой ручной декомпозиции. Матрица Pixi `{a,
b, c, d, tx, ty}` маппится в row-major CanvasKit как
`[a, c, tx, b, d, ty, 0, 0, 1]`.

### Хит-тест (`hitTest.ts`)

Обход контейнера в **обратном** порядке детей: Pixi рисует children по
индексу, значит самый верхний по z-стеку — последний; хит-тест должен
проверять его первым. У интерактивных листьев (`eventMode = "static"`)
зовётся либо `hitArea.contains(local)`, либо нативный
`obj.containsPoint(global)`. Важно: Pixi-овые `Graphics.containsPoint` и
`Sprite.containsPoint` сами применяют `worldTransform.applyInverse`, то
есть **ждут глобальную точку** — это легко перепутать, в коде есть
комментарий.

### Экспорт в PDF (`pdfExport.ts`)

1. Через `CK.MakePDFDocument(stream, metadata)` создаётся документ.
   `MakePDFDocument` доступен только в кастомной сборке CanvasKit (см.
   ниже) — для типов npm-пакета `canvaskit-wasm` его нет, поэтому в коде
   делается аккуратный каст через `Partial<PdfCapableCanvasKit>`.
2. На каждой странице — `beginPage(w, h)` → тот же `renderPixiToSkia`
   рисует сцену → `endPage()`. Графика, шрифты и пути идут в PDF как
   **векторные** примитивы.
3. `PIXI.Sprite` экспортируется как JPEG-битмап — это разрешённое ТЗ
   исключение (`PIXI.Sprite – как bitmap`). JPEG-кодек подключается в
   кастомной WASM-сборке через `SkPDF::JPEG::MetadataWithCallbacks()`.
4. Готовый PDF поток оборачивается в `Blob` и скачивается как
   `scene.pdf`.

### Интерактивность

`pointerdown` / `pointerup` подписываются на каждый интересный
`DisplayObject` обычным `g1.on("pointerdown", ...)`. Дальше:

- **Pixi-канвас** — события доставляются штатным interaction-manager'ом
  Pixi (включается `eventMode: "static"` на сцене и каждой фигуре).
- **Skia-канвас** — на DOM-канвасе висят нативные `pointerdown` /
  `pointerup`. По координате клика выполняется `hitTest`, и если фигура
  найдена — событие переотправляется через `target.emit(type, synth)`.
  Поскольку `EventEmitter` у `DisplayObject` один и тот же, **тот же**
  `.on(...)`-обработчик из `App.tsx` срабатывает независимо от того, по
  какому канвасу пользователь кликнул.

Откройте DevTools, кликните по `g1` слева или справа — в консоль уйдёт
`g1 pointerdown!` в обоих случаях.

Кнопка **«Сгенерировать случайную фигуру»** добавляет в живой контейнер
случайный объект одного из пяти типов: прямоугольник, эллипс, круг,
линия, спрайт. Это покрывает все обязательные по ТЗ типы PIXI-объектов
на обоих рендерерах.

---

## Кастомная сборка CanvasKit

`canvaskit-wasm` из npm идёт **без** PDF-бэкенда (бинарь собран только с
graphics-плагином). Чтобы получить векторный PDF, понадобилось
пересобрать CanvasKit вручную:

- В `skia-build/` лежит подробный пошаговый рецепт под WSL / Linux:
  установка `depot_tools`, `emsdk`, синхронизация Skia, патч
  `modules/canvaskit/canvaskit_bindings.cpp` для подключения
  JPEG-коллбэков (`SkPDF::JPEG::MetadataWithCallbacks()` из
  `include/docs/SkPDFJpegHelpers.h`), сборка с `skia_enable_pdf=true`.
- Готовые `canvaskit.js` + `canvaskit.wasm` уже скопированы в `public/`,
  Vite раздаёт их статикой и кладёт в `dist/` при `npm run build`. Если
  хочется пересобрать с нуля — см. [skia-build/README.md](skia-build/README.md).

Без этой сборки приложение продолжит работать (рендер и события), но
кнопка «Экспорт в PDF» покажет ошибку отсутствующего бэкенда.

---

## Деплой

Сборка полностью статическая — её можно положить на Vercel / Netlify /
GitHub Pages простым копированием `dist/`:

```bash
npm run build
# dist/ содержит index.html + assets + canvaskit.js + canvaskit.wasm
```

Главное — не забыть, что `public/canvaskit.wasm` и `public/canvaskit.js`
обязательно должны попасть в деплой (Vite копирует всё содержимое
`public/` в `dist/` автоматически на этапе билда).

Пример деплоя через CLI Vercel:

```bash
npm i -g vercel
npm run build
vercel --prod
```

---

## Что включено в репозиторий как «отчёт»

- Полные исходники приложения (`src/`).
- Готовая кастомная сборка CanvasKit (`public/canvaskit.{js,wasm}`).
- Рецепт пересборки CanvasKit (`skia-build/README.md`).
- Пример сгенерированного PDF (`scene.pdf`) — скачивается из
  приложения кнопкой «Export to PDF», открывается в любом просмотрщике;
  при увеличении видно, что фигуры остаются векторными, а спрайт
  встроен как JPEG (разрешённое ТЗ исключение).
