/**
 * Created by sam on 04.11.2016.
 */

import {IColumnDesc, createRankDesc} from '../model';
import Ranking from '../model/Ranking';
import ADataProvider, {IDataProviderOptions} from './ADataProvider';


function isComplexAccessor(column: any) {
  // something like a.b or a[4]
  return typeof column === 'string' && column.indexOf('.') >= 0;
}

function resolveComplex(column: string, row: any) {
  const resolve = (obj: any, col: string) => {
    if (obj === undefined) {
      return obj; // propagate invalid values
    }
    if (/\d+/.test(col)) { // index
      return obj[+col];
    }
    return obj[col];
  };
  return column.split('.').reduce(resolve, row);
}

function rowGetter(row: any, index: number, id: string, desc: any) {
  var column = desc.column;
  if (isComplexAccessor(column)) {
    return resolveComplex(<string>column, row);
  }
  return row[column];
}

/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
abstract class ACommonDataProvider extends ADataProvider {

  private rankingIndex = 0;

  /**
   * the local ranking orders
   * @type {{}}
   */
  private ranks = new Map<string, number[]>();

  constructor(private columns: IColumnDesc[] = [], options: IDataProviderOptions = {}) {
    super(options);
    //generate the accessor
    columns.forEach((d: any) => {
      d.accessor = d.accessor || rowGetter;
      d.label = d.label || d.column;
    });
  }

  protected rankAccessor(row: any, index:number, id: string, desc: IColumnDesc, ranking: Ranking) {
    return (this.ranks[ranking.id].indexOf(index)) + 1;
  }

  cloneRanking(existing?: Ranking) {
    var id = this.nextRankingId();
    var new_ = new Ranking(id);

    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(new_, child.desc);
      });
    } else {
      new_.push(this.create(createRankDesc()));
    }

    return new_;
  }

  cleanUpRanking(ranking: Ranking) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking: Ranking): Promise<number[]> {
    //use the server side to sort
    return this.sortImpl(ranking).then((argsort) => {
      //store the result
      this.ranks[ranking.id] = argsort;
      return argsort;
    });
  }

  protected abstract sortImpl(ranking: Ranking): Promise<number[]>;

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column: IColumnDesc) {
    var d: any = column;
    d.accessor = d.accessor || rowGetter;
    d.label = column.label || d.column;
    this.columns.push(column);
    this.fire(ADataProvider.EVENT_ADD_DESC, d);
  }

  getColumns(): IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref: string) {
    return this.columns.filter((c) => (<any>c).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc: any): any {
    return desc.column ? desc.type + '@' + desc.column : desc;
  }

  fromDescRef(descRef: any): any {
    if (typeof(descRef) === 'string') {
      return this.columns.filter((d: any) => d.type + '@' + d.column === descRef) [0];
    }
    return descRef;
  }

  restore(dump: any) {
    super.restore(dump);
    this.rankingIndex = 1 + Math.max(...this.getRankings().map((r) => +r.id.substring(4)));
  }

  nextRankingId() {
    return 'rank' + (this.rankingIndex++);
  }
}

export default ACommonDataProvider;
