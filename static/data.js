(function() {
    var timezone = 'UTC';

    var drawSubtask = function(data) {
        var subtask = d3.select(this)
            .append('div')
            .classed('days__day__tasks__task', true);

        var title = subtask.append('div')
            .classed('days__day__tasks__task__title', true);

        title.append('span')
            .classed('days__day__tasks__task__title__bullet', true)
            .text('•');

        title.append('span')
            .classed('days__day__tasks__task__title__text', true)
            .text(data.title);
    };

    var emojiRegex = /^([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/;

    var getListTitle = function(list) {
        if (list.list_type === 'inbox') {
            return 'Inbox';
        }

        var emoji = list.title.match(emojiRegex);

        return emoji === null
            ? list.title
            : list.title.replace(emoji[0], emoji[0] + ' ');
    };

    let usedLists = [];

    var drawTask = function(data) {
        var task = d3.select(this)
            .append('div')
            .classed('days__day__tasks__task', true)
            .classed('days__day__tasks__task_not-completed', !data.task.completed);

        if (usedLists.indexOf(data.list.id) === -1) {
            usedLists.push(data.list.id);

            task.append('div')
                .classed('days__day__tasks__task__list', true)
                .html(getListTitle(data.list));
        }

        var title = task.append('div')
            .classed('days__day__tasks__task__title', true);

        title.append('span')
            .classed('days__day__tasks__task__title__bullet', true)
            .text('•');

        title.append('span')
            .classed('days__day__tasks__task__title__text', true)
            .text(data.task.title);

        if (data.task.subtasks.length > 0) {
            task.append('div')
                .classed('days__day__tasks__task__subtasks', true)
                .selectAll('*')
                .data(data.task.subtasks)
                .enter()
                .each(drawSubtask);
        }
    };

    var getRelevantSubtasks = function(day, task) {
        var today = moment(day.start);
        var tomorrow = moment(day.end);

        return task.task.subtasks
            .filter(subtask => subtask.completed
                && moment(subtask.completed_at).isAfter(today)
                && moment(subtask.completed_at).isBefore(tomorrow))
            .sort(function(a, b) {
                return moment(a.completed_at).unix() - moment(b.completed_at).unix();
            });
    };

    var drawDay = function(data, i) {
        var today = moment(data.day.start).tz(timezone);
        var isToday = today.isoWeekday() === moment().tz(timezone).isoWeekday();

        var day = d3.select(this)
            .append('div')
            .classed('days__day', true)
            .classed('days__day_selected', isToday)
            .classed('days__day_today', isToday)
            .classed('days__day_weekend', today.isoWeekday() >= 6);

        day.append('div')
            .classed('days__day__title', true)
            .text(today.format('dddd'));

        usedLists = [];

        if (data.tasks.length > 0) {
            data.tasks.forEach(task => {
                task.task.subtasks = getRelevantSubtasks(data.day, task);
            });

            day.append('div')
                .classed('days__day__tasks', true)
                .selectAll('*')
                .data(data.tasks)
                .enter()
                .each(drawTask);
        }
        else {
            day.append('div')
                .classed('days__day__tasks-placeholder', true)
                .text('No tasks yet');
        }

        d3.select('.days-switcher')
            .selectAll('.days-switcher__day')
            .each(function(data, j) {
                if (i === j) {
                    d3.select(this).classed('days-switcher__day_today', isToday);
                    d3.select(this).classed('days-switcher__day_selected', isToday);
                }
            });
    };

    var drawDaySwitcher = function(data) {
        var today = moment(data.day.start).tz(timezone)
    };

    var getWeekName = function(days) {
        return 'Week ' + moment(days[0].day.start).tz(timezone).isoWeek();
    };

    var getWeekDates = function(days) {
        var firstDay = moment(days[0].day.start).tz(timezone);
        var lastDay = moment(days[days.length - 1].day.start).tz(timezone);

        return firstDay.month() === lastDay.month()
            ? firstDay.format('MMM D') + '–' + lastDay.format('D')
            : firstDay.format('MMM D') + '&thinsp;–&thinsp;' + lastDay.format('MMM D');
    };

    var getWeekSummary = function(days) {
        var tasks = days.reduce((count, day) => {
            return count + day.tasks
                .filter(task => task.task.completed).length;
        }, 0);

        var subtasks = days.reduce((count, day) => {
            return count + day.tasks
                .filter(task => !task.task.completed)
                .reduce((subcount, task) => {
                    return subcount + getRelevantSubtasks(day.day, task).length;
                }, 0);
        }, 0);

        return { tasks, subtasks };
    };

    var drawDays = function(days) {
        d3.select('.days')
            .selectAll('*')
            .remove();

        d3.select('.days')
            .selectAll('*')
            .data(days)
            .enter()
            .each(drawDay);

        d3.select('.days-switcher')
            .selectAll('.days-switcher__day')
            .each(function(data, i) {
                d3.select(this).on('click', function() {
                    d3.select('.days-switcher')
                        .selectAll('.days-switcher__day')
                        .classed('days-switcher__day_selected', false);

                    d3.select(this)
                        .classed('days-switcher__day_selected', true);

                    d3.select('.days')
                        .selectAll('.days__day')
                        .each(function(data, j) {
                            d3.select(this).classed('days__day_selected', i === j);
                        });
                });
            });

        var summary = d3.select('.days')
            .append('div')
            .classed('days__day', true)
            .classed('days__day_summary', true);

        summary.append('div')
            .classed('days__day__title', true)
            .text(getWeekName(days));

        summary.append('div')
            .classed('days__day__date', true)
            .html(getWeekDates(days));

        var counts = getWeekSummary(days);

        summary.append('div')
            .classed('days__day__week-summary', true)
            .html(counts.tasks + ' tasks');

        summary.append('div')
            .classed('days__day__week-summary__subtasks', true)
            .html(counts.subtasks + ' subtasks');
    };

    const dummyDays = [
        { day: { start: '2017-01-02T00:00:00Z', end: '2017-01-03T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-03T00:00:00Z', end: '2017-01-04T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-04T00:00:00Z', end: '2017-01-05T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-05T00:00:00Z', end: '2017-01-06T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-06T00:00:00Z', end: '2017-01-07T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-07T00:00:00Z', end: '2017-01-08T00:00:00Z' }, tasks: [] },
        { day: { start: '2017-01-08T00:00:00Z', end: '2017-01-09T00:00:00Z' }, tasks: [] }
    ];

    drawDays(dummyDays);

    d3.json('/tasks.json', function(data) {
        timezone = data.timezone;
        drawDays(data.tasks);
    });
})();