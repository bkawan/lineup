/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import Column from './model/Column';
import StringColumn from './model/StringColumn';
import AnnotateColumn from './model/AnnotateColumn';
import LinkColumn from './model/LinkColumn';
import SelectionColumn from './model/SelectionColumn';
import StackColumn from './model/StackColumn';
import CategoricalColumn from './model/CategoricalColumn';
import {INumberColumn} from './model/NumberColumn';
import {forEach, attr, clipText, ITextRenderHints} from './utils';
import {hsl} from 'd3';
import {IDataRow} from './provider/ADataProvider';
import * as d3 from 'd3';
import MultiValueColumn from './model/MultiValueColumn';
import UpsetColumn from './model/UpsetColumn';

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
export interface IRenderContext<T> {
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;

  /**
   * render a column
   * @param col
   */
  renderer(col: Column): T;

  /**
   * prefix used for all generated id names
   */
  idPrefix: string;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param default_ default value
   */
  option<T>(key: string, default_: T): T;
}

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer<Element>>;

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IDOMCellRenderer<T> {
  /**
   * template as a basis for the update
   */
  template: string;
  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param d the data item
   * @param i the order relative index
   */
  update(node: T, d: IDataRow, i: number): void;
}
export declare type ISVGCellRenderer = IDOMCellRenderer<SVGElement>;
export declare type IHTMLCellRenderer = IDOMCellRenderer<HTMLElement>;


export interface ICanvasRenderContext extends IRenderContext<CanvasRenderingContext2D> {
  hovered(dataIndex: number): boolean;
  selected(dataIndex: number): boolean;
  textHints: ITextRenderHints;
}

export interface ICanvasCellRenderer {
  /**
   * renders the current item
   * @param ctx
   * @param d
   * @param i
   */
  (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number): void;
}

export interface ICellRendererFactory {
  createSVG?(col: Column, context: IDOMRenderContext): ISVGCellRenderer;
  createHTML?(col: Column, context: IDOMRenderContext): IHTMLCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
}
/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {
  /**
   * class to append to the text elements
   * @type {string}
   */
  textClass = 'text';
  /**
   * the text alignment: left, center, right
   * @type {string}
   */
  align: string = 'left';

  constructor(textClass = 'text', align = 'left') {
    this.textClass = textClass;
    this.align = align;
  }

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class="${this.textClass}" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>`,
      update: (n: SVGTextElement, d: IDataRow, i: number) => {
        var alignmentShift = 2;
        if (this.align === 'right') {
          alignmentShift = col.getWidth() - 5;
        } else if (this.align === 'center') {
          alignmentShift = col.getWidth() * 0.5;
        }
        attr(n, {
          x: alignmentShift
        });
        n.textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"></div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        attr(n, {}, {
          width: `${col.getWidth()}px`
        });
        n.textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const bak = ctx.textAlign;
      ctx.textAlign = this.align;
      const w = col.getWidth();
      var shift = 0;
      if (this.align === 'center') {
        shift = w / 2;
      } else if (this.align === 'right') {
        shift = w;
      }
      clipText(ctx, col.getLabel(d.v, d.dataIndex), shift, 0, w, context.textHints);
      ctx.textAlign = bak;
    };
  }
}


class HeatmapCellRenderer implements ICellRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    const padding = context.option('rowPadding', 1);

    return {

      template: `<g class="heatmapcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rect = d3.select(n).selectAll('rect').data(col.getValue(d.v, d.dataIndex));

        rect.enter().append('rect');
        rect
          .attr({
            y: padding,
            x: (d, i) => (i * celldimension),
            width: celldimension,
            height: context.rowHeight(i),
            fill: (d, i) => multiValueColumn.getColor(d)
          });
        rect.exit().remove();
      }
    };
  }


  createHTML(col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    const padding = context.option('rowPadding', 1);

    return {
      template: `<div class="heatmapcell" style="top:${padding}px;">
                                   </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const g = d3.select(n);
        const div = g.selectAll('div').data(col.getValue(d.v, d.dataIndex));
        div.enter().append('div');
        div
          .style({
            'width': celldimension + 'px',
            'background-color': multiValueColumn.getColor(d),
            'height': context.rowHeight(i) + 'px',
            'left': (d, i) => (i * celldimension) + 'px'
          });


      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    const padding = context.option('rowPadding', 1);

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {

      var data = col.getValue(d.v, d.dataIndex);
      data.forEach(function (d, i) {

        var x = (i * celldimension);
        ctx.beginPath();
        ctx.fillStyle = multiValueColumn.getColor(d);
        ctx.fillRect(x, padding, celldimension, context.rowHeight(i));
      });
    };
  }

}


class SparklineCellRenderer implements ICellRendererFactory {


  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    return {

      template: `<g class="sparklinecell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const path = d3.select(n).selectAll('path').data([<any>col.getValue(d.v, d.dataIndex)]);
        var line = d3.svg.line<number>();
        path.enter().append('path');
        path
          .attr('d', function (d, i) {
            line
              .x((d, i) => multiValueColumn.getxScale(i))
              .y((d, i) => multiValueColumn.getyScale(d, context.rowHeight(i)));
            return line(<any>d);
          });
        path.exit().remove();
      }
    };
  }


  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {

    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      var data = col.getValue(d.v, d.dataIndex);
      var xpos, ypos;
      data.forEach(function (d, i) {

        if (i === 0) {
          xpos = multiValueColumn.getxScale(i);
          ypos = multiValueColumn.getyScale(d, context.rowHeight(i));
        } else {
          ctx.strokeStyle = 'black';
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.moveTo(xpos, ypos);
          xpos = multiValueColumn.getxScale(i);
          ypos = multiValueColumn.getyScale(d, context.rowHeight(i));
          ctx.lineTo(xpos, ypos);
          ctx.stroke();
          ctx.fill();

        }
      });
    };
  }
}

class ThresholdCellRenderer implements ICellRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    const binaryColor = multiValueColumn.getbinaryColor();

    return {

      template: `<g class="thresholdcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rect = d3.select(n).selectAll('rect').data(<any>col.getValue(d.v, d.dataIndex));
        rect.enter().append('rect');
        rect
          .attr({
            y: (d, i) => (d < multiValueColumn.getthresholdValue()) ? (context.rowHeight(i) / 2) : 0,
            x: (d, i) => (i * celldimension),
            width: celldimension,
            height: (d, i) => (context.rowHeight(i)) / 2,
            fill: (d) => (d < multiValueColumn.getthresholdValue()) ? binaryColor[0] : binaryColor[1]
          });
        rect.exit().remove();
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {

    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    const binaryColor = multiValueColumn.getbinaryColor();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      var data = col.getValue(d.v, d.dataIndex);
      data.forEach(function (d, i) {
        ctx.beginPath();
        var xpos = (i * celldimension);
        var ypos = (d < multiValueColumn.getthresholdValue()) ? (context.rowHeight(i) / 2) : 0;
        ctx.fillStyle = (d < multiValueColumn.getthresholdValue()) ? binaryColor[0] : binaryColor[1];
        ctx.fillRect(xpos, ypos, celldimension, context.rowHeight(i) / 2);
      });
    };
  }

}
class VerticalBarCellRenderer implements ICellRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {

    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();
    return {

      template: `<g class="verticalbarcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rect = d3.select(n).selectAll('rect').data(<any>col.getValue(d.v, d.dataIndex));
        rect.enter().append('rect');
        rect
          .attr({
            y: (d, i) => multiValueColumn.getyposVerticalBar(d, context.rowHeight(i)),
            x: (d, i) => (i * celldimension),
            width: celldimension,
            height: (d, i) => multiValueColumn.getVerticalBarHeight(d, context.rowHeight(i)),
            fill: (d, i) => multiValueColumn.getColor(d)
          });
        rect.exit().remove();
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {

    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const celldimension = multiValueColumn.calculateCellDimension();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      var data = col.getValue(d.v, d.dataIndex);
      data.forEach(function (d, i) {
        var xpos = (i * celldimension);
        var ypos = multiValueColumn.getyposVerticalBar(d, context.rowHeight(i));
        ctx.fillStyle = multiValueColumn.getColor(d);
        ctx.fillRect(xpos, ypos, celldimension, multiValueColumn.getVerticalBarHeight(d, context.rowHeight(i)));
      });
    };
  }


}
class BoxplotCellRenderer implements ICellRendererFactory {


  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);
    const padding = context.option('rowPadding', 1);

    return {

      template: `<g class="boxplotcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const boxdata = multiValueColumn.getboxPlotData(col.getValue(d.v, d.dataIndex));
        const rect = d3.select(n).selectAll('rect').data([col.getValue(d.v, d.dataIndex)]);

        rect.enter().append('rect');
        rect
          .attr('class', 'boxplotrect')
          .attr({
            y: padding,
            x: boxdata.q1,
            width: (boxdata.q3 - boxdata.q1),
            height: (d, i) =>context.rowHeight(i)
          });
        rect.exit().remove();

        const path = d3.select(n).selectAll('path').data([<any>col.getValue(d.v, d.dataIndex)]);
        path.enter().append('path');
        path
          .attr('class', 'boxplotline')
          .attr('d', function (d, i) {
            const left = boxdata.min, right = boxdata.max, center = boxdata.median;
            const bottom = Math.max(context.rowHeight(i) - padding, 0);
            const middle = (bottom - padding) / 2;

            return 'M' + left + ',' + middle + 'L' + boxdata.q1 + ',' + middle +
              'M' + left + ',' + padding + 'L' + left + ',' + bottom +
              'M' + center + ',' + padding + 'L' + center + ',' + bottom +
              'M' + (boxdata.q3) + ',' + middle + 'L' + (right) + ',' + middle +
              'M' + right + ',' + padding + 'L' + right + ',' + bottom;

          });
        path.exit().remove();

      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const multiValueColumn: MultiValueColumn = (<MultiValueColumn>col);

    const padding = context.option('rowPadding', 1);

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      // Rectangle
      const boxdata = multiValueColumn.getboxPlotData(col.getValue(d.v, d.dataIndex));
      ctx.fillStyle = '#e0e0e0';
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.rect(boxdata.q1, padding, (boxdata.q3 - boxdata.q1), context.rowHeight(i) - padding);
      ctx.fill();
      ctx.stroke();

      //Line
      const left = boxdata.min, right = boxdata.max, center = boxdata.median;
      const bottom = Math.max(context.rowHeight(i) - padding, 0);
      const middle = (bottom - padding) / 2;
      ctx.strokeStyle = 'black';
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(left, middle);
      ctx.lineTo(boxdata.q1, middle);
      ctx.moveTo(left, padding);
      ctx.lineTo(left, bottom);
      ctx.moveTo(center, padding);
      ctx.lineTo(center, bottom);
      ctx.moveTo(boxdata.q3, middle);
      ctx.lineTo(right, middle);
      ctx.moveTo(right, padding);
      ctx.lineTo(right, bottom);
      ctx.stroke();
      ctx.fill();

    };
  }


}

class UpsetCellRenderer implements ICellRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const upsetColumn: UpsetColumn = (<UpsetColumn>col);
    const celldimension = upsetColumn.cellDimension();

    return {
      template: `<g class="upsetcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const circle = d3.select(n).selectAll('circle').data(<any>col.getValue(d.v, d.dataIndex));
        circle.enter().append('circle');
        circle
          .attr({
            cy: (d: any, i) => (context.rowHeight(i) / 2),
            cx: (d: any, i) => (i * celldimension) + (celldimension / 2),
            r: (celldimension / 4),
            class: 'upsetcircle',
            opacity: (d) =>(d === 1) ? 1 : 0.1
          });
        circle.exit().remove();
        const path = d3.select(n).selectAll('path').data(<any>[col.getValue(d.v, d.dataIndex)]);
        const countcategory = col.getValue(d.v, d.dataIndex).filter((x) => x === 1).length;
        if (countcategory > 1) {
          path.enter().append('path');
          path
            .attr('d', function (d, i) {

              const pathcordinate = upsetColumn.calculatePath(d);

              return 'M' + (pathcordinate.left) + ',' + (context.rowHeight(i) / 2) + 'L' + (pathcordinate.right) + ',' + (context.rowHeight(i) / 2);

            })
            .attr('class', 'upsetpath');
        }
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const upsetColumn: UpsetColumn = (<UpsetColumn>col);
    const celldimension = upsetColumn.cellDimension();


    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      // Circle
      var data = col.getValue(d.v, d.dataIndex);
      var countcategory = data.filter((x) => x === 1).length;
      const radius = (context.rowHeight(i) / 3);
      const pathcordinate = upsetColumn.calculatePath(data);

      if (countcategory > 1) {
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo((pathcordinate.left), (context.rowHeight(i) / 2));
        ctx.lineTo((pathcordinate.right), (context.rowHeight(i) / 2));
        ctx.fill();
        ctx.stroke();
      }

      data.forEach(function (d, i) {
        var posy = (context.rowHeight(i) / 2);
        var posx = (i * celldimension) + (celldimension / 2);
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.globalAlpha = (d === 1) ? 1 : 0.1;
        ctx.arc(posx, posy, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });


    };
  }

}

class CircleColumnCellRenderer implements ICellRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {

    return {

      template: `<g class="circlecolumncell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {

        const circle = d3.select(n).selectAll('circle').data([<any>col.getValue(d.v, d.dataIndex)]);
        circle.enter().append('circle');
        circle
          .attr({
            cy: (d: any, i) => (context.rowHeight(i) / 2),
            cx: (d: any, i) => (col.getWidth() / 2),
            r: (context.rowHeight(i) / 2) * col.getValue(d.v, d.dataIndex),
            class: 'circlecolumn'
          });
      }
    };
  }


  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {


    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {

      var posy = (context.rowHeight(i) / 2);
      var posx = (col.getWidth() / 2);

      ctx.fillStyle = 'black';
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.arc(posx, posy, (context.rowHeight(i) / 2) * col.getValue(d.v, d.dataIndex), 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    };
  }
}

/**
 * a renderer rendering a bar for numerical columns
 */
export class BarCellRenderer implements ICellRendererFactory {
  /**
   * flag to always render the value
   * @type {boolean}
   */
  protected renderValue = false;

  constructor(renderValue = false, private colorOf: (d: any, i: number, col: Column)=>string = (d, i, col) => col.color) {
    this.renderValue = renderValue;
  }

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {


    const padding = context.option('rowPadding', 1);
    return {
      template: `<g class="bar">
          <rect class="${col.cssClass}" y="${padding}" style="fill: ${col.color}">
            <title></title>
          </rect>
          <text class="number ${this.renderValue ? '' : 'hoverOnly'}" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>
        </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        n.querySelector('rect title').textContent = col.getLabel(d.v, d.dataIndex);
        const width = col.getWidth() * col.getValue(d.v, d.dataIndex);

        attr(<SVGRectElement>n.querySelector('rect'), {
          y: padding,
          width: isNaN(width) ? 0 : width,
          height: context.rowHeight(i) - padding * 2
        }, {
          fill: this.colorOf(d.v, i, col)
        });
        attr(<SVGTextElement>n.querySelector('text'), {}).textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<div class="bar" style="top:${padding}px; background-color: ${col.color}">
          <span class="number ${this.renderValue ? '' : 'hoverOnly'}"></span>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const width = col.getWidth() * col.getValue(d.v, d.dataIndex);
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          width: `${isNaN(width) ? 0 : width}px`,
          height: `${context.rowHeight(i) - padding * 2}px`,
          top: `${padding}px`,
          'background-color': this.colorOf(d.v, i, col)
        });
        n.querySelector('span').textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {

    const padding = context.option('rowPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = this.colorOf(d.v, i, col);
      // console.log(col.getValue(d.v, d.dataIndex),d.v)
      const width = col.getWidth() * col.getValue(d.v, d.dataIndex);
      ctx.fillRect(padding, padding, isNaN(width) ? 0 : width, context.rowHeight(i) - padding * 2);
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, col.getWidth() - 1, context.textHints);
      }
    };
  }
}

function toHeatMapColor(d: any, index: number, col: INumberColumn & Column) {
  var v = col.getNumber(d, index);
  if (isNaN(v)) {
    v = 0;
  }
  //hsl space encoding, encode in lightness
  var color = hsl(col.color || Column.DEFAULT_COLOR);
  color.l = v;
  return color.toString();
}

const heatmap = {
  createSVG: function (col: INumberColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<rect class="heatmap ${col.cssClass}" y="${padding}" style="fill: ${col.color}">
            <title></title>
          </rect>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        n.querySelector('title').textContent = col.getLabel(d.v, d.dataIndex);
        const w = context.rowHeight(i) - padding * 2;

        attr(n, {
          y: padding,
          width: w,
          height: w
        }, {
          fill: toHeatMapColor(d.v, d.dataIndex, col)
        });
      }
    };
  },
  createHTML: function (col: INumberColumn & Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<div class="heatmap ${col.cssClass}" style="background-color: ${col.color}; top: ${padding}"></div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const w = context.rowHeight(i) - padding * 2;
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          width: `${w}px`,
          height: `${w}px`,
          top: `${padding}px`,
          'background-color': toHeatMapColor(d.v, d.dataIndex, col)
        });
      }
    };
  },
  createCanvas: function (col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const w = context.rowHeight(i) - padding * 2;
      ctx.fillStyle = toHeatMapColor(d.v, d.dataIndex, col);
      ctx.fillRect(padding, padding, w, w);
    };
  }
};

const action = {
  createSVG: function (col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const actions = context.option('actions', []);
    return {
      template: `<text class="actions hoverOnly fa">${actions.map((a) =>`<tspan title="${a.name}">${a.icon}></tspan>`)}</text>`,
      update: (n: SVGTextElement, d: IDataRow, i: number) => {
        forEach(n, 'tspan', (ni: SVGTSpanElement, i) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  },
  createHTML: function (col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const actions = context.option('actions', []);
    return {
      template: `<div class="actions hoverOnly">${actions.map((a) =>`<span title="${a.name}" class="fa">${a.icon}></span>`)}</div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        forEach(n, 'span', (ni: HTMLSpanElement, i) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  },
  createCanvas: function (col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const actions = context.option('actions', []);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        let overlay = showOverlay(context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.classList.add('actions');
        overlay.innerHTML = actions.map((a) =>`<span title="${a.name}" class="fa">${a.icon}</span>`).join('');
        forEach(overlay, 'span', (ni: HTMLSpanElement, i) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  }
};

const selection = {
  createSVG: function (col: SelectionColumn): ISVGCellRenderer {
    return {
      template: `<text class="selection fa"><tspan class="selectionOnly">\uf046</tspan><tspan class="notSelectionOnly">\uf096</tspan></text>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.toggleValue(d.v, d.dataIndex);
        };
      }
    };
  },
  createHTML: function (col: SelectionColumn): IHTMLCellRenderer {
    return {
      template: `<div class="selection fa"></div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.toggleValue(d.v, d.dataIndex);
        };
      }
    };
  },
  createCanvas: function (col: SelectionColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const bak = ctx.font;
      ctx.font = '10pt FontAwesome';
      clipText(ctx, col.getValue(d.v, d.dataIndex) ? '\uf046' : '\uf096', 0, 0, col.getWidth(), context.textHints);
      ctx.font = bak;
    };
  }
};

const annotate = {
  createSVG: function (col: AnnotateColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<g class="annotations">
        <text class="notHoverOnly text" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>
        <foreignObject class="hoverOnly" x="-2", y="-2">
          <input type="text">
        </foreignObject>
       </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const input: HTMLInputElement = <HTMLInputElement>n.querySelector('foreignObject *');
        input.onchange = function (event) {
          col.setValue(d.v, d.dataIndex, this.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
        input.style.width = col.getWidth() + 'px';
        input.value = col.getLabel(d.v, d.dataIndex);

        n.querySelector('text').textContent = col.getLabel(d.v, d.dataIndex);
        const f = n.querySelector('foreignObject');
        f.setAttribute('width', String(col.getWidth()));
        f.setAttribute('height', String(context.rowHeight(i)));
      }
    };
  },
  createHTML: function (col: AnnotateColumn): IHTMLCellRenderer {
    return {
      template: `<div class="annotations text">
        <input type="text" class="hoverOnly">
        <span class="text notHoverOnly"></span>
       </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const input: HTMLInputElement = <HTMLInputElement>n.querySelector('input');
        input.onchange = function (event) {
          col.setValue(d.v, d.dataIndex, this.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
        n.style.width = input.style.width = col.getWidth() + 'px';
        input.value = col.getLabel(d.v, d.dataIndex);
        n.querySelector('span').textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  },
  createCanvas: function (col: AnnotateColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        let overlay = showOverlay(context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.innerHTML = `<input type="text" value="${col.getValue(d.v, d.dataIndex)}" style="width:${col.getWidth()}px">`;
        const input = <HTMLInputElement>overlay.childNodes[0];
        input.onchange = function (event) {
          col.setValue(d.v, d.dataIndex, this.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
      } else {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
      }
    };
  }
};

function showOverlay(id: string, dx: number, dy: number) {
  var overlay = <HTMLDivElement>document.querySelector(`div.lu-overlay#O${id}`);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.classList.add('lu-overlay');
    overlay.id = 'O' + id;
    document.querySelector('.lu-body').appendChild(overlay);
  }
  overlay.style.display = 'block';
  overlay.style.left = dx + 'px';
  overlay.style.top = dy + 'px';
  return overlay;
}

export function hideOverlays() {
  forEach(document.querySelector('div.lu-body'), 'div.lu-overlay', (d: HTMLDivElement) => d.style.display = null);
}

const link = {
  createSVG: function (col: LinkColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class="link text" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>`,
      update: (n: SVGTextElement, d: IDataRow, i: number) => {
        n.innerHTML = col.isLink(d.v, d.dataIndex) ? `<a class="link" xlink:href="${col.getValue(d.v, d.dataIndex)}" target="_blank">${col.getLabel(d.v, d.dataIndex)}</a>` : col.getLabel(d.v, d.dataIndex);
      }
    };
  },
  createHTML: function (col: LinkColumn): IHTMLCellRenderer {
    return {
      template: `<div class="link text"></div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        n.style.width = col.getWidth() + 'px';
        n.innerHTML = col.isLink(d.v, d.dataIndex) ? `<a class="link" href="${col.getValue(d.v, d.dataIndex)}" target="_blank">${col.getLabel(d.v, d.dataIndex)}</a>` : col.getLabel(d.v, d.dataIndex);
      }
    };
  },
  createCanvas: function (col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const isLink = col.isLink(d.v, d.dataIndex);
      if (!isLink) {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
        return;
      }
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        let overlay = showOverlay(context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.innerHTML = `<a class="link" href="${col.getValue(d.v, d.dataIndex)}" target="_blank">${col.getLabel(d.v, d.dataIndex)}</a>`;
      } else {
        const bak = ctx.fillStyle;
        ctx.fillStyle = context.option('style.link', context.option('style.text', 'black'));
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
        ctx.fillStyle = bak;
      }
    };
  }
};

/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
class StringCellRenderer {
  private alignments = {
    left: new DefaultCellRenderer(),
    right: new DefaultCellRenderer('text_right', 'right'),
    center: new DefaultCellRenderer('text_center', 'center')
  };

  createSVG(col: StringColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return this.alignments[col.alignment].createSVG(col, context);
  }

  createHTML(col: StringColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    return this.alignments[col.alignment].createHTML(col, context);
  }

  createCanvas(col: StringColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return this.alignments[col.alignment].createCanvas(col, context);
  }
}

/**
 * renders categorical columns as a colored rect with label
 */
export class CategoricalCellRenderer implements ICellRendererFactory {
  /**
   * class to append to the text elements
   * @type {string}
   */
  textClass = 'cat';

  constructor(textClass = 'cat') {
    this.textClass = textClass;
  }

  createSVG(col: CategoricalColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<g class="${this.textClass}">
        <text clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>
        <rect y="${padding}"></rect>
      </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const cell = Math.max(context.rowHeight(i) - padding * 2, 0);

        attr(<SVGRectElement>n.querySelector('rect'), {
          width: cell,
          height: cell
        }, {
          fill: col.getColor(d.v, d.dataIndex)
        });
        attr(<SVGTextElement>n.querySelector('text'), {
          x: context.rowHeight(i)
        }).textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: CategoricalColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<div class="${this.textClass}">
        <div></div>
        <span></span>
      </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const cell = Math.max(context.rowHeight(i) - padding * 2, 0);
        attr(n, {}, {
          width: `${col.getWidth()}px`
        });
        attr(<HTMLDivElement>n.querySelector('div'), {}, {
          width: cell + 'px',
          height: cell + 'px',
          'background-color': col.getColor(d.v, d.dataIndex)
        });
        attr(<HTMLSpanElement>n.querySelector('span'), {}).textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: CategoricalColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const cell = Math.max(context.rowHeight(i) - padding * 2, 0);
      ctx.fillStyle = col.getColor(d.v, d.dataIndex);
      ctx.fillRect(0, 0, cell, cell);
      ctx.fillStyle = context.option('style.text', 'black');
      clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, col.getWidth() - cell - 2, context.textHints);
    };
  };
}

/**
 * machtes the columns and the dom nodes representing them
 * @param node
 * @param columns
 * @param helperType
 */
export function matchColumns(node: SVGGElement | HTMLElement, columns: { column: Column, renderer: IDOMCellRenderer<any> }[], helperType = 'svg') {
  if (node.childElementCount === 0) {
    // initial call fast method
    node.innerHTML = columns.map((c) => c.renderer.template).join('');
    columns.forEach((col, i) => {
      var cnode = <Element>node.childNodes[i];
      // set attribute for finding again
      cnode.setAttribute('data-column-id', col.column.id);
      // store current renderer
      cnode.setAttribute('data-renderer', col.column.rendererType());
    });
    return;
  }

  function matches(c: {column: Column}, i: number) {
    //do both match?
    const n = <Element>(node.childElementCount <= i ? null : node.childNodes[i]);
    return n != null && n.getAttribute('data-column-id') === c.column.id && n.getAttribute('data-renderer') === c.column.rendererType();
  }

  if (columns.every(matches)) {
    return; //nothing to do
  }

  const idsAndRenderer = new Set(columns.map((c) => c.column.id + '@' + c.column.rendererType()));
  //remove all that are not existing anymore
  Array.prototype.slice.call(node.childNodes).forEach((n) => {
    const id = n.getAttribute('data-column-id');
    const renderer = n.getAttribute('data-renderer');
    const idAndRenderer = id + '@' + renderer;
    if (!idsAndRenderer.has(idAndRenderer)) {
      node.removeChild(n);
    }
  });
  const helper = helperType === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : document.createElement('div');
  columns.forEach((col) => {
    var cnode = node.querySelector(`[data-column-id="${col.column.id}"]`);
    if (!cnode) {
      //create one
      helper.innerHTML = col.renderer.template;
      cnode = <Element>helper.childNodes[0];
      cnode.setAttribute('data-column-id', col.column.id);
      cnode.setAttribute('data-renderer', col.column.rendererType());
    }
    node.appendChild(cnode);
  });
}

/**
 * renders a stacked column using composite pattern
 */
class StackCellRenderer implements ICellRendererFactory {
  constructor(private nestingPossible = true) {
  }

  private createData(col: StackColumn, context: IRenderContext<any>) {
    const stacked = this.nestingPossible && context.option('stacked', true);
    const padding = context.option('columnPadding', 0);
    var offset = 0;
    return col.children.map((d) => {
      var shift = offset;
      offset += d.getWidth();
      offset += (!stacked ? padding : 0);
      return {
        column: d,
        shift: shift,
        stacked: stacked,
        renderer: context.renderer(d)
      };
    });
  }

  createSVG(col: StackColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const cols = this.createData(col, context);
    return {
      template: `<g class="stack component${context.option('stackLevel', 0)}">${cols.map((d) => d.renderer.template).join('')}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        var stackShift = 0;
        matchColumns(n, cols);
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          cnode.setAttribute('transform', `translate(${col.shift - stackShift},0)`);
          col.renderer.update(cnode, d, i);
          if (col.stacked) {
            stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
          }
        });
      }
    };
  }

  createHTML(col: StackColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const cols = this.createData(col, context);
    return {
      template: `<div class="stack component${context.option('stackLevel', 0)}">${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        var stackShift = 0;
        matchColumns(n, cols, 'html');
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          cnode.style.transform = `translate(${col.shift - stackShift}px,0)`;
          col.renderer.update(cnode, d, i);
          if (col.stacked) {
            stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
          }
        });
      }
    };
  }

  createCanvas(col: StackColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cols = this.createData(col, context);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      var stackShift = 0;
      cols.forEach((col, ci) => {
        var shift = 0;
        ctx.translate(shift = col.shift - stackShift, 0);
        col.renderer(ctx, d, i, dx + shift, dy);
        ctx.translate(-(col.shift - stackShift), 0);
        if (col.stacked) {
          stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }
}

export const defaultCellRenderer = new DefaultCellRenderer();
const combineCellRenderer = new BarCellRenderer(false, (d, i, col: any) => col.getColor(d));

/**
 * default render factories
 */
export const renderers: {[key: string]: ICellRendererFactory} = {
  rank: new DefaultCellRenderer('rank', 'right'),
  boolean: new DefaultCellRenderer('boolean', 'center'),
  number: new BarCellRenderer(),
  ordinal: new BarCellRenderer(true, (d, i, col: any) => col.getColor(d)),
  string: new StringCellRenderer(),
  selection: selection,
  heatmap: heatmap,
  link: link,
  annotate: annotate,
  actions: action,
  stack: new StackCellRenderer(),
  nested: new StackCellRenderer(false),
  categorical: new CategoricalCellRenderer(),
  max: combineCellRenderer,
  min: combineCellRenderer,
  mean: combineCellRenderer,
  script: combineCellRenderer,
  heatmapcustom: new HeatmapCellRenderer(),
  threshold: new ThresholdCellRenderer(),
  sparkline: new SparklineCellRenderer(),
  verticalbar: new VerticalBarCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  upset: new UpsetCellRenderer(),
  circle: new CircleColumnCellRenderer()
};

function chooseRenderer(col: Column, renderers: {[key: string]: ICellRendererFactory}): ICellRendererFactory {
  const r = renderers[col.rendererType()];
  return r || defaultCellRenderer;
}

export function createSVG(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IDOMRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createSVG ? r.createSVG.bind(r) : defaultCellRenderer.createSVG.bind(r))(col, context);
}
export function createHTML(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IDOMRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createHTML ? r.createHTML.bind(r) : defaultCellRenderer.createHTML.bind(r))(col, context);
}
export function createCanvas(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: ICanvasRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createCanvas ? r.createCanvas.bind(r) : defaultCellRenderer.createCanvas.bind(r))(col, context);
}
