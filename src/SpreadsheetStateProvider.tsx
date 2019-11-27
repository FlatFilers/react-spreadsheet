import shallowEqual from "fbjs/lib/shallowEqual";
import React, { Component } from "react";
import createStore, { Store } from "unistore";
import devtools from "unistore/devtools";
import { Provider } from "unistore/react";

import { Action, setData } from "./actions";
import { Matrix } from "./matrix";
import { from as pointMapFrom } from "./point-map";
import { from as pointSetFrom, toArray } from "./point-set";
import Spreadsheet, { Props as SpreadsheetProps } from "./Spreadsheet";
import {CellBase, IPoint, IStoreState, Mode} from "./types";

export { createEmptyMatrix } from "./util";

type Unsubscribe = () => void;

export interface IProps<CellType, Value>
  extends SpreadsheetProps<CellType, Value> {
  onChange: (data: Matrix<CellType>) => void;
  onModeChange: (mode: Mode) => void;
  onSelect: (selected: IPoint[]) => void;
  onActivate: (active: IPoint) => void;
  onCellCommit: (
    prevCell: null | CellType,
    nextCell: null | CellType,
    coords: IPoint
  ) => void;
}

const initialState: Partial<IStoreState<any>> = {
  selected: pointSetFrom([]),
  copied: pointMapFrom([]),
  active: null,
  mode: "view",
  rowDimensions: {},
  columnDimensions: {},
  lastChanged: null,
  bindings: pointMapFrom([])
};

export default class SpreadsheetStateProvider<
  CellType extends CellBase,
  Value
> extends Component<IProps<CellType, Value>, IStoreState<CellType>> {
  public store: Store<IStoreState<CellType>>;
  public unsubscribe: Unsubscribe;
  public prevState: IStoreState<CellType>;

  private static defaultProps = {
    // tslint:disable-next-line:no-empty
    onChange: () => {},
    // tslint:disable-next-line:no-empty
    onModeChange: () => {},
    // tslint:disable-next-line:no-empty
    onSelect: () => {},
    // tslint:disable-next-line:no-empty
    onActivate: () => {},
    // tslint:disable-next-line:no-empty
    onCellCommit: () => {}
  };

  constructor(props: IProps<CellType, Value>) {
    super(props);
    const state: IStoreState<CellType> | any = {
      ...initialState,
      data: this.props.data
    };
    // tslint:disable-next-line:no-empty
    this.unsubscribe = () => {};
    this.store =
      process.env.NODE_ENV === "production"
        ? createStore(state)
        : devtools(createStore(state));
    this.prevState = state;
  }

  public shouldComponentUpdate(nextProps: IProps<CellType, Value>) {
    const { data, ...rest } = this.props;
    const { data: nextData, ...nextRest } = nextProps;
    return !shallowEqual(rest, nextRest) || nextData !== this.prevState.data;
  }

  public componentDidMount() {
    const {
      onChange,
      onModeChange,
      onSelect,
      onActivate,
      onCellCommit
    } = this.props;
    this.unsubscribe = this.store.subscribe((state: IStoreState<CellType>) => {
      const { prevState } = this;

      if (state.lastCommit && state.lastCommit !== prevState.lastCommit) {
        for (const change of state.lastCommit) {
          onCellCommit(change.prevCell, change.nextCell, state.active);
        }
      }

      if (state.data !== prevState.data && state.data !== this.props.data) {
        onChange(state.data);
      }
      if (state.mode !== prevState.mode) {
        onModeChange(state.mode);
      }
      if (state.selected !== prevState.selected) {
        onSelect(toArray(state.selected));
      }
      if (state.active !== prevState.active && state.active) {
        onActivate(state.active);
      }
      this.prevState = state;
    });
  }

  public componentDidUpdate(prevProps: IProps<CellType, Value>) {
    if (this.props.data !== this.prevState.data) {
      this.store.setState(
        setData(this.store.getState(), this.props.data) as Partial<Action>
      );
    }
  }

  public componentWillUnmount() {
    this.unsubscribe();
  }

  public render() {
    const { ...rest } = this.props;
    console.log(this.props.data)
    return (
      <Provider store={this.store}>
        <Spreadsheet {...rest} store={this.store} />
      </Provider>
    );
  }
}
