import React, { ChangeEvent, PureComponent, ReactNode } from "react";
import { DataEditorProps } from "./types";
import { moveCursorToEnd } from "./util";

type Cell = {
  value: ReactNode;
};

type Value = string | number;

class DataEditor extends PureComponent<DataEditorProps<Cell, Value>> {
  public input?: HTMLInputElement;

  private static defaultProps = {
    value: ""
  };

  private handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { onChange, cell } = this.props;
    onChange({ ...cell, value: e.target.value });
  };

  private handleInput = (input?: HTMLInputElement) => {
    this.input = input;
  };

  public componentDidMount() {
    if (this.input) {
      moveCursorToEnd(this.input);
    }
  }

  public render() {
    const { getValue, column, row, cell } = this.props;
    const value = getValue({ column, row, data: cell }) || "";
    return (
      <div className="DataEditor">
        <input
          ref={this.handleInput}
          type="text"
          onChange={this.handleChange}
          value={value}
          autoFocus
        />
      </div>
    );
  }
}

export default DataEditor;
