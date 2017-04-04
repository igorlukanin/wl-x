(function() {
    var drawTask = function(data) {
        var task = d3.select(this)
            .append('div')
            .classed('days__day__tasks__task', true);

        task
            .append('div')
            .classed('days__day__tasks__task__list', true)
            .text(data.list.title);

        task.append('div')
            .classed('days__day__tasks__task__title', true)
            .text(data.task.title);

        console.log(data);
    };

    var drawDay = function(data) {
        var day = d3.select(this)
            .append('div')
            .classed('days__day', true);

        day.append('div')
            .classed('days__day__title', true)
            .text(moment(data.day.start).format('dddd'));

        day.append('div')
            .classed('days__day__date', true)
            .text(moment(data.day.start).format('MMM D'));

        day.append('div')
            .classed('days__day__tasks', true)
            .selectAll('*')
            .data(data.tasks)
            .enter()
            .each(drawTask);
    };

    var drawDays = function(days) {
        d3.select('.days')
            .selectAll('*')
            .data(days)
            .enter()
            .each(drawDay);

        d3.select('.days')
            .append('div')
            .classed('days__day', true)
            .classed('days__day_summary', true);
    };

    d3.json('/tasks.json', drawDays);
})();