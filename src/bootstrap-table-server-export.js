/**
 * @author chhuean <chhuean@163.com>
 */

(function ($) {
    'use strict';
    var sprintf = $.fn.bootstrapTable.utils.sprintf;

    var TYPE_NAME = {
        json: 'JSON',
        xml: 'XML',
        png: 'PNG',
        csv: 'CSV',
        txt: 'TXT',
        sql: 'SQL',
        doc: 'MS-Word',
        excel: 'MS-Excel',
        powerpoint: 'MS-Powerpoint',
        pdf: 'PDF'
    };

    $.extend($.fn.bootstrapTable.defaults, {
        showServerExport: false,
        exportDataType: 'basic', // basic, all, selected
        // 'json', 'xml', 'png', 'csv', 'txt', 'sql', 'doc', 'excel', 'powerpoint', 'pdf'
        exportTypes: ['json', 'xml', 'csv', 'txt', 'sql', 'excel'],
        exportOptions: {},
        onExport: function(url) {
            var $eleForm = $("<form method='get'></form>");

            $eleForm.attr("action", url);

            $(document.body).append($eleForm);

            $eleForm.submit();
        }
    });

    $.extend($.fn.bootstrapTable.defaults.icons, {
        export: 'glyphicon-export icon-share'
    });

    $.extend($.fn.bootstrapTable.locales, {
        formatExport: function () {
            return 'Export data';
        }
    });
    $.extend($.fn.bootstrapTable.defaults, $.fn.bootstrapTable.locales);

    var BootstrapTable = $.fn.bootstrapTable.Constructor,
        _initToolbar = BootstrapTable.prototype.initToolbar;

    BootstrapTable.EVENTS = $.extend(BootstrapTable.EVENTS, { 'export.bs.table': 'onExport'});

    BootstrapTable.prototype.initToolbar = function () {
        this.showToolbar = this.options.showServerExport;

        _initToolbar.apply(this, Array.prototype.slice.apply(arguments));

        if (this.options.showServerExport) {
            var that = this,
                $btnGroup = this.$toolbar.find('>.btn-group'),
                $export = $btnGroup.find('div.export');

            if (!$export.length) {
                $export = $([
                    '<div class="export btn-group">',
                    '<button class="btn' +
                    sprintf(' btn-%s', this.options.buttonsClass) +
                    sprintf(' btn-%s', this.options.iconSize) +
                    ' dropdown-toggle" ' +
                    'title="' + this.options.formatExport() + '" ' +
                    'data-toggle="dropdown" type="button">',
                    sprintf('<i class="%s %s"></i> ', this.options.iconsPrefix, this.options.icons.export),
                    '<span class="caret"></span>',
                    '</button>',
                    '<ul class="dropdown-menu" role="menu">',
                    '</ul>',
                    '</div>'].join('')).appendTo($btnGroup);

                var $menu = $export.find('.dropdown-menu'),
                    exportTypes = this.options.exportTypes;

                if (typeof this.options.exportTypes === 'string') {
                    var types = this.options.exportTypes.slice(1, -1).replace(/ /g, '').split(',');

                    exportTypes = [];
                    $.each(types, function (i, value) {
                        exportTypes.push(value.slice(1, -1));
                    });
                }
                $.each(exportTypes, function (i, type) {
                    if (TYPE_NAME.hasOwnProperty(type)) {
                        $menu.append(['<li data-type="' + type + '">',
                            '<a href="javascript:void(0)">',
                        TYPE_NAME[type],
                            '</a>',
                            '</li>'].join(''));
                    }
                });

                $menu.find('li').click(function () {
                    var type = $(this).data('type');
                    that.initExportServer(undefined, undefined, undefined, { "exportType": type });
                });
            }
        }
    };

    BootstrapTable.prototype.initExportServer = function (silent, query, url, tags) {
        var that = this,
            data = {},
            index = $.inArray(this.options.sortName, this.header.fields),
            params = {
                searchText: this.searchText,
                sortName: this.options.sortName,
                sortOrder: this.options.sortOrder
            },
            request;

        if (this.header.sortNames[index]) {
            params.sortName = this.header.sortNames[index];
        }

        $.extend(params, tags);

        if (this.options.pagination && this.options.sidePagination === 'server') {
            params.exportServer = 1;
        } else {
            params.exportServer = 0;
        }

        if (!(url || this.options.exportUrl || this.options.url) && !this.options.ajax) {
            return;
        }

        if (!($.isEmptyObject(this.filterColumnsPartial))) {
            params.filter = JSON.stringify(this.filterColumnsPartial, null);
        }

        params.columns = [];
        $.each(that.options.columns[0],
            function (i, column) {
                if (column.visible) {
                    params.columns.push({ field: column.field, title: column.title });
                }
            });

        data = calculateObjectValue(this.options, this.options.queryParams, [params], data);

        $.extend(data, query || {});

        // false to stop request
        if (data === false) {
            return;
        }

        if (!silent) {
            this.$tableLoading.show();
        }
        request = $.extend({}, calculateObjectValue(null, this.options.ajaxOptions), {
            type: this.options.exportMethod || this.options.method,
            url: url || this.options.exportUrl || this.options.url,
            data: this.options.contentType === 'application/json' && this.options.method === 'post' ?
                JSON.stringify(data) : data,
            cache: this.options.cache,
            contentType: this.options.contentType,
            dataType: this.options.dataType,
            success: function (res) {
                res = calculateObjectValue(that.options, that.options.responseExportHandler, [res], res);

                //                that.load(res);
                that.trigger('export', res);
                if (!silent) that.$tableLoading.hide();
            },
            error: function (res) {
                if (!silent) that.$tableLoading.hide();
            }
        });

        if (this.options.ajax) {
            calculateObjectValue(this, this.options.ajax, [request], null);
        } else {
            if (this._xhr && this._xhr.readyState !== 4) {
                this._xhr.abort();
            }
            this._xhr = $.ajax(request);
        }
    }

    var calculateObjectValue = function (self, name, args, defaultValue) {
        var func = name;

        if (typeof name === 'string') {
            // support obj.func1.func2
            var names = name.split('.');

            if (names.length > 1) {
                func = window;
                $.each(names, function (i, f) {
                    func = func[f];
                });
            } else {
                func = window[name];
            }
        }
        if (typeof func === 'object') {
            return func;
        }
        if (typeof func === 'function') {
            return func.apply(self, args || []);
        }
        if (!func && typeof name === 'string' && sprintf.apply(this, [name].concat(args))) {
            return sprintf.apply(this, [name].concat(args));
        }
        return defaultValue;
    };
})(jQuery);
