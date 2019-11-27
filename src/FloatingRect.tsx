import classnames from "classnames";
import React from "react";

import "./FloatingRect.css";
import { onEdge, PointSet, reduce, size } from "./point-set";
import { IDimensions, IStoreState } from "./types";
import { getCellDimensions } from "./util";

type Props = {
  className?: string;
  hidden?: boolean;
} & IDimensions;

const FloatingRect = ({
  width,
  height,
  top,
  left,
  className,
  hidden
}: Props) => (
  <div
    className={classnames("FloatingRect", { hidden }, className)}
    style={{ width, height, top, left }}
  />
);

const getRangeDimensions = (
  points: PointSet,
  state: IStoreState<any>
): IDimensions => {
  const { width, height, left, top } = reduce(
    (acc, point) => {
      const isOnEdge = onEdge(points, point);
      const dimensions = getCellDimensions(point, state);
      if (dimensions) {
        acc.width = isOnEdge.top ? acc.width + dimensions.width : acc.width;
        acc.height = isOnEdge.left
          ? acc.height + dimensions.height
          : acc.height;
        acc.left = isOnEdge.left && isOnEdge.top ? dimensions.left : acc.left;
        acc.top = isOnEdge.left && isOnEdge.top ? dimensions.top : acc.top;
      }
      return acc;
    },
    points,
    { left: 0, top: 0, width: 0, height: 0 }
  );
  return { left, top, width, height };
};

export const mapStateToProps = (cells: PointSet) => (
  state: IStoreState<any>
) => {
  return {
    ...getRangeDimensions(cells, state),
    hidden: size(cells) === 0
  };
};

export default FloatingRect;
