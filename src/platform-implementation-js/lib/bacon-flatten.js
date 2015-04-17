import _ from 'lodash';
import Bacon from 'baconjs';

// Alternative to stream.flatMap(Bacon.fromArray) which doesn't fail to
// https://github.com/baconjs/bacon.js/issues/574.

export default function baconFlatten(stream) {
  return Bacon.fromBinder(sink =>
    stream.subscribe(event => {
      if (event.hasValue()) {
        _.some(event.value(), item =>
          sink(new Bacon.Next(_.constant(item))) === Bacon.noMore
        );
      } else {
        sink(event);
      }
    })
  );
}
