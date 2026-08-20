import type { MessageKey } from './ru'

export const be: Record<MessageKey, string> = {
  'nav.home': 'Галоўная',
  'nav.stats': 'Статыстыка',
  'nav.reports': 'Справаздачы',
  'nav.settings': 'Налады',

  'common.close': 'Закрыць',
  'common.cancel': 'Адмена',
  'common.delete': 'Выдаліць',
  'common.edit': 'Рэдагаваць',
  'common.save': 'Захаваць',
  'common.saving': 'Захаванне…',
  'common.add': 'Дадаць',
  'common.loading': 'Загрузка…',
  'common.error': 'Памылка',
  'common.empty': 'Пуста',
  'common.all': 'Усе',
  'common.excel': 'Excel',
  'common.csv': 'CSV',

  'home.title': 'Галоўная',
  'home.subtitle': 'Адзін клік — новы інтэрвал. Улічваецца па даце і часе старту.',
  'home.start': 'ЛЕЕЕТСГО',
  'home.starting': 'ЛЕЕЕТСГО…',
  'home.manual': 'Уручную',
  'home.startError': 'Не атрымалася запусціць',
  'home.active': 'Актыўныя',
  'home.activeEmpty': 'Няма актыўных таймераў — націсніце «ЛЕЕЕТСГО».',
  'home.completedToday': 'Сёння завершана',
  'home.completedYesterday': 'Учора завершана',
  'home.completedEmpty': 'Пакуль пуста.',
  'home.editInterval': 'Рэдагаваць інтэрвал',
  'home.deleteTitle': 'Выдаліць інтэрвал?',

  'timer.paused': 'На паўзе',
  'timer.running': 'Ідзе',
  'timer.resume': 'Пуск',
  'timer.pause': 'Паўза',
  'timer.complete': 'Завяршыць',
  'timer.deleteAria': 'Выдаліць',

  'completeDialog.title': 'Завяршыць інтэрвал',
  'completeDialog.editTitle': 'Рэдагаваць інтэрвал',
  'completeDialog.start': 'Пачатак',
  'completeDialog.end': 'Канец',
  'completeDialog.coefficient': 'Каэфіцыент',
  'completeDialog.coefInvalid': 'Каэфіцыент павінен быць > 0',
  'completeDialog.endBeforeStart': 'Канец павінен быць пазней за пачатак',
  'completeDialog.saveError': 'Памылка захавання',
  'completeDialog.workTime': 'У працы: {{time}}',
  'completeDialog.pauseTime': 'Паўзы: {{time}}',

  'manualDialog.title': 'Ручны інтэрвал',
  'manualDialog.start': 'Пачатак',
  'manualDialog.end': 'Канец',
  'manualDialog.coefficient': 'Каэфіцыент',
  'manualDialog.coefInvalid': 'Каэфіцыент павінен быць > 0',
  'manualDialog.endBeforeStart': 'Канец павінен быць пазней за пачатак',
  'manualDialog.create': 'Стварыць',

  'workItems.label': 'Работы',
  'workItems.add': 'Дадаць',
  'workItems.emptyHint': 'Можна завяршыць без работ.',
  'workItems.category': 'Катэгорыя',
  'workItems.description': 'Апісанне',
  'workItems.quantity': 'Кол-ць',
  'workItems.unit': 'Адз.',
  'workItems.deleteAria': 'Выдаліць работу',
  'workItems.fillAll': 'Запоўніце катэгорыю, апісанне і адзінку',
  'workItems.confirmCategory': 'Пацвердзіце катэгорыю галачкай або выберыце са спісу',
  'workItems.confirmDescription': 'Пацвердзіце апісанне галачкай або выберыце са спісу',
  'workItems.confirmUnit': 'Пацвердзіце адзінку галачкай або выберыце са спісу',
  'workItems.quantityInvalid': 'Колькасць работы павінна быць > 0',

  'dict.saveAria': 'Захаваць у даведнік',

  'dateTime.date': 'Дата',
  'dateTime.time': 'Час',
  'dateTime.required': 'Укажыце дату і час',
  'dateTime.invalid': 'Няправільныя дата або час',

  'monthPicker.prev': 'Папярэдні месяц',
  'monthPicker.next': 'Наступны месяц',

  'weekday.mon': 'Пн',
  'weekday.tue': 'Аў',
  'weekday.wed': 'Ср',
  'weekday.thu': 'Чц',
  'weekday.fri': 'Пт',
  'weekday.sat': 'Сб',
  'weekday.sun': 'Нд',

  'stats.title': 'Статыстыка',
  'stats.subtitle': 'Агульная зводка, фільтры па перыядзе і праўка інтэрвалаў.',
  'stats.mode.all': 'Усе',
  'stats.mode.month': 'Месяц',
  'stats.mode.day': 'Дзень',
  'stats.mode.range': 'Перыяд',
  'stats.rangePickFrom': 'Выберыце пачатковы дзень у календары',
  'stats.rangePickTo': 'Выберыце канцавы дзень',
  'stats.rangeSelected': 'Перыяд: {{from}} — {{to}}',
  'stats.filters': 'Фільтры',
  'stats.coefficient': 'Каэфіцыент',
  'stats.noCoefData': 'няма даных',
  'stats.coefFrom': 'ад',
  'stats.coefTo': 'да',
  'stats.coefFromAria': 'Каэфіцыент ад',
  'stats.coefToAria': 'Каэфіцыент да',
  'stats.coefBoundsHint': 'Пустое «ад» = {{min}}, пустое «да» = {{max}}',
  'stats.category': 'Катэгорыя',
  'stats.categoryAll': 'Усе катэгорыі',
  'stats.sort': 'Сартаванне',
  'stats.sort.date': 'Па даце',
  'stats.sort.duration': 'Па працягласці',
  'stats.sort.coefficient': 'Па каэфіцыенце',
  'stats.sort.amount': 'Па суме',
  'stats.metric.totalHoursAll': 'Усяго гадзін',
  'stats.metric.totalHoursPeriod': 'Гадзін за перыяд',
  'stats.metric.avgPerWorkedDay': 'Сяр. гадзін / раб. дзень',
  'stats.metric.workedDays': '{{count}} дз. з работай',
  'stats.metric.avgCoef': 'Сярэдні каэф.',
  'stats.metric.avgCoefHint': 'Узважаны па гадзінах',
  'stats.metric.earned': 'Зароблена',
  'stats.metric.employerPay': 'Працадаўца: {{amount}}',
  'stats.metric.intervals': 'Інтэрвалаў',
  'stats.metric.avgLength': 'Сяр. даўжыня {{hours}}',
  'stats.metric.pauses': 'Паўзы',
  'stats.metric.efficiency': 'У працы {{percent}}%',
  'stats.metric.expenses': 'Выдаткі: {{amount}}',
  'stats.heatmap.less': 'Менш',
  'stats.heatmap.more': 'Больш',
  'stats.monthsChart': 'Гадзіны па месяцах',
  'stats.topCategories': 'Топ катэгорый',
  'stats.topWorks': 'Топ работ',
  'stats.list.all': 'Усе інтэрвалы',
  'stats.list.period': 'Інтэрвалы перыяду',
  'stats.listEmpty': 'Няма інтэрвалаў па выбраных фільтрах.',
  'stats.deleteTitle': 'Выдаліць інтэрвал?',

  'reports.title': 'Справаздачы',
  'reports.subtitle': 'Зарплата і задачы за месяц',
  'reports.tab.salary': 'Зарплата',
  'reports.tab.tasks': 'Задачы',
  'reports.total': 'Разам',
  'reports.employer': 'Працадаўца (+{{taxRate}}%)',
  'reports.employerWithExpenses':
    'Працадаўца (+{{taxRate}}% + {{expenses}} {{currency}})',
  'expenses.add': 'Дадаць расходы',
  'expenses.list': 'Расходы за месяц',
  'expenses.addTitle': 'Артыкул расходаў',
  'expenses.listTitle': 'Расходы за месяц',
  'expenses.name': 'Назва',
  'expenses.namePlaceholder': 'Падпіска Higgsfield…',
  'expenses.nameHint': 'Абярыце са спісу або захавайце новую назву галачкай',
  'expenses.nameNotApproved': 'Захавайце назву галачкай або абярыце са спісу',
  'expenses.amount': 'Сума',
  'expenses.amountInvalid': 'Пазначце суму больш за 0',
  'expenses.empty': 'Расходаў за гэты месяц пакуль няма',
  'expenses.total': 'Разам расходы',
  'expenses.deleteTitle': 'Выдаліць артыкул расходаў?',
  'reports.col.dateTime': 'Дата / час',
  'reports.col.hours': 'Гадзіны',
  'reports.col.coef': 'Каэф.',
  'reports.col.amount': 'Сума',
  'reports.salaryEmpty': 'Няма інтэрвалаў за месяц.',
  'reports.groupBy': 'Групоўка',
  'reports.groupBy.both': 'Катэгорыя + апісанне',
  'reports.groupBy.category': 'Катэгорыя',
  'reports.groupBy.description': 'Апісанне',
  'reports.col.category': 'Катэгорыя',
  'reports.col.description': 'Апісанне',
  'reports.col.quantity': 'Кол-ць',
  'reports.col.unit': 'Адз.',
  'reports.tasksEmpty': 'Няма работ за месяц.',
  'reports.loadError': 'Памылка загрузкі справаздачы',

  'settings.title': 'Налады',
  'settings.subtitle': 'Тэма, мова, стаўка, падатак, валюта і даведнікі работ.',
  'settings.theme': 'Тэма',
  'settings.theme.light': 'Светлая',
  'settings.theme.dark': 'Цёмная',
  'settings.theme.cozy': 'Утульная',
  'settings.theme.system': 'Сістэмная',
  'settings.theme.telegram': 'Як у Telegram',
  'settings.language': 'Мова',
  'settings.language.ru': 'Русский',
  'settings.language.be': 'Беларуская',
  'settings.pay': 'Аплата',
  'settings.hourlyRate': 'Стаўка за гадзіну',
  'settings.tax': 'Падатак, %',
  'settings.currency': 'Валюта',
  'settings.timezone': 'Часавы пояс уліку: Мінск',
  'settings.saved': 'Захавана',
  'settings.saveError': 'Не атрымалася захаваць',
  'settings.dict.categories': 'Катэгорыі',
  'settings.dict.descriptions': 'Апісанні работ',
  'settings.dict.units': 'Адзінкі',
  'settings.dict.expenses': 'Артыкулы расходаў',
  'settings.dict.newPlaceholder': 'Новае значэнне',

  'settings.export.title': 'Экспорт',
  'settings.export.json': 'Спампаваць JSON-бэкап',

  'templates.title': 'Шаблоны работ',
  'templates.pick': 'Шаблон',
  'templates.save': 'Захаваць як шаблон',
  'templates.namePrompt': 'Назва шаблона',
  'templates.nameLabel': 'Назва',
  'templates.alreadyExists': 'Такі шаблон ужо ёсць',
  'templates.settingsHint': 'Рэдагуйце назвы або выдаляйце шаблоны. Новыя — з дыялога работ.',

  'notes.label': 'Нататка',
  'notes.placeholder': 'Каментарый да інтэрвалу…',
  'notes.toggle': 'Дадаць нататку',

  'list.notesIndicator': 'Ёсць нататка',

  'dicts.nameRequired': 'Укажыце назву',
  'dicts.duplicateName': 'Такая назва ўжо ёсць',
  'dicts.deleteInUse': 'Нельга выдаліць: выкарыстоўваецца ў працах',
  'dicts.deleteInUseExpenses': 'Нельга выдаліць: ёсць расходы з такой назвай',

  'sync.queued': 'Не сінхранізавана — будзе адпраўлена пры з’яўленні сеткі',
  'sync.authError': 'Памылка аўтарызацыі — адкрыйце праграму з Telegram',
  'sync.retryLater': 'Не сінхранізавана — паўтор пры наступным падключэнні',

  'timeDisplay.from': 'з {{time}}',

  'excel.tasks.category': 'Катэгорыя',
  'excel.tasks.description': 'Апісанне',
  'excel.tasks.quantity': 'Колькасць',
  'excel.tasks.unit': 'Адзінка',

  'memory.welcome.meta': 'Твая «тая самая» часцінка',
  'memory.welcome.p1':
    'Тут я хачу пазнаць цябе крышачку лепш і дапамагчы ўспомніць тую сябе, якой ты была раней - і заўважаць, колькі ад яе засталося ў табе зараз.',
  'memory.welcome.p2':
    'Далей будуць пытанні, якія я хацеў бы табе задаць, але каб не бянтэжыць, зрабіў іх у такім выглядзе)',
  'memory.welcome.p3':
    'Гэта твой сшытак. Адказвай так, як адчуваеш, не спяшайся, не бойся памыліцца ці забыць штосьці важнае.',

  'memory.welcome.start': 'Пачаць',
  'memory.finish.quote':
    'Тая дзяўчынка нікуды не сышла. Яна проста стала глыбей і здабыла вакол сябе яшчэ больш, чым раней) Кахаю цябе!',
  'memory.finish.hint':
    'Можаш вярнуцца да пытанняў у любы час. А каб выйсці - націсні на «NasTale» зверху.',
  'memory.finish.edit': 'Паглядзець адказы',
  'memory.placeholder': 'Напішы туць…',
  'memory.closeAria': 'Закрыць NasTale',
  'memory.saveError':
    'Нешта пайшло не так, але твой адказ захаваўся лакальна. Мы паспрабуем зноў пазней.',
  'memory.nav.back': 'Назад',
  'memory.nav.next': 'Далей',
  'memory.nav.done': 'Усё)',

  'memory.q.time-period.theme': 'Час',
  'memory.q.time-period.text':
    'Зазірні ў той час, пра які ты ўспамінаеш. Які ўзрост ці перыяд адгукаецца табе першым?',

  'memory.q.time-place.theme': 'Месца',
  'memory.q.time-place.text':
    'Дзе ты тады была? Гарады, двары, пасядзелкі, кавярні, падарожжы - тыя месцы, якія захоўваюць твае сляды.',

  'memory.q.memory-day.theme': 'Цёплыя моманты',
  'memory.q.memory-day.text':
    'Калі б можна было пражыць адзін звычайны дзень з таго часу зноў, які бы ты выбрала? Нават калі дэталі ўжо сцёрліся, хай будзе так, як адчуваецца.',

  'memory.q.memory-detail.theme': 'Цёплыя моманты',
  'memory.q.memory-detail.text':
    'Якая драбязь з таго часу дагэтуль усплывае ў цябе першай? Можа быць пах, святло, музыка, голас, месца, дотык.',

  'memory.q.feelings-body.theme': 'Пачуцці і стан',
  'memory.q.feelings-body.text':
    'Што ты тады адчувала ў целе, калі была «сабой»? Можа быць лёгкасць, адвага, цяпло, жаданне жыць, быць, адчуваць.',

  'memory.q.feelings-spark.theme': 'Пачуцці і стан',
  'memory.q.feelings-spark.text':
    'Што прымушала цябе тады ўспыхваць? Радасць, злосць, закаханасць, мара, воля - што разпальвала гэты агонь?',

  'memory.q.music-repeat.theme': 'Музыка',
  'memory.q.music-repeat.text':
    'Якую музыку ты тады ставіла на паўтор? Можа, памятаеш выканаўца, песню, альбом ці проста настрой.',

  'memory.q.music-where.theme': 'Музыка',
  'memory.q.music-where.text':
    'Дзе і як ты яе слухала? У навушніках у цемры, з калонкі на кухні, у машыне, пад дажджом.',

  'memory.q.books-screen.theme': 'Кнігі і кіно',
  'memory.q.books-screen.text':
    'Што ты тады чытала ці глядзела і адчувала — «гэта пра мяне»? Можа, кніга, фільм, серыял, гераіня.',

  'memory.q.people-near.theme': 'Людзі',
  'memory.q.people-near.text':
    'Хто тады быў побач так, што побач з ім ці з ёй ты была больш сабой?',

  'memory.q.time-evenings.theme': 'Вечары і настрой',
  'memory.q.time-evenings.text':
    'Як ты любіла праводзіць вечары і выходныя ў той час? Адна, з кімсьці, гуляць, нешта ствараць, проста быць - што было тваім рытуалам?',

  'memory.q.time-lost.theme': 'Вечары і настрой',
  'memory.q.time-lost.text':
    'Што з таго, чым ты жыла тады, амаль ці цалкам знікла з тваіх дзён зараз?',

  'memory.q.now-bridge.theme': 'Цяперашняе',
  'memory.q.now-bridge.text':
    'Дзе ў звычайным дні сёння ты сустракаеш тую сябе - нават на секунду?',

  'memory.q.now-piece.theme': 'Цяперашняе',
  'memory.q.now-piece.text':
    'Калі б можна было вярнуць адзін маленькі кавалачак таго жыцця на найбліжэйшыя дні - што б ты выбрала?',

  'memory.q.open-add.theme': 'Проста думкі',
  'memory.q.open-add.text':
    'Калі ёсць штосьці яшчэ, што хочаш расказаць:',
}
