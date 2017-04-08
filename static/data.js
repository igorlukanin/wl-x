(function() {
    var timezone = 'UTC';

    var drawSubtask = function(data) {
        var subtask = d3.select(this)
            .append('div')
            .classed('days__day__tasks__task', true);

        subtask.append('div')
            .classed('days__day__tasks__task__title', true)
            .text(data.title);
    };

    var emojiRegex = /^([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/;

    var getListTitle = function(list) {
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

        task.append('div')
            .classed('days__day__tasks__task__title', true)
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

    var drawDay = function(data) {
        var today = moment(data.day.start).tz(timezone);

        var day = d3.select(this)
            .append('div')
            .classed('days__day', true)
            .classed('days__day_today', today.isoWeekday() === moment().tz(timezone).isoWeekday())
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
            .data(days)
            .enter()
            .each(drawDay);

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

    d3.json('/tasks.json', function(data) {
        timezone = data.timezone;
        drawDays(data.tasks);
    });
})();