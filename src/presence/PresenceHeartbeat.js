// @flow strict-local
import { PureComponent } from 'react';
import type { ComponentType } from 'react';
import { AppState } from 'react-native';
import type { Dispatch } from '../types';

import { connect } from '../react-redux';
import { getHasAuth } from '../account/accountsSelectors';
import { reportPresence } from '../actions';
import Heartbeat from './heartbeat';

type OuterProps = $ReadOnly<{||}>;

type SelectorProps = $ReadOnly<{|
  hasAuth: boolean,
|}>;

type Props = $ReadOnly<{|
  ...OuterProps,

  // from `connect`
  dispatch: Dispatch,
  ...SelectorProps,
|}>;

/**
 * Component providing a recurrent `presence` signal.
 */
// The name "PureComponent" is potentially misleading here, as this component is
// in no reasonable sense "pure" -- its entire purpose is to emit network calls
// for their observable side effects as a side effect of being rendered.
//
// (This is merely a misnomer on React's part, rather than a functional error. A
// `PureComponent` is simply one which never updates except when its props have
// changed -- which is exactly what we want.)
class PresenceHeartbeatInner extends PureComponent<Props> {
  /** Callback for Heartbeat object. */
  onHeartbeat = () => {
    if (this.props.hasAuth) {
      // TODO(#5005): should ensure this gets the intended account
      this.props.dispatch(reportPresence(true));
    }
  };

  heartbeat: Heartbeat = new Heartbeat(this.onHeartbeat, 1000 * 60);

  componentDidMount() {
    AppState.addEventListener('change', this.updateHeartbeatState);
    this.updateHeartbeatState(); // conditional start
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.updateHeartbeatState);
    this.heartbeat.stop(); // unconditional stop
  }

  // React to any state change.
  updateHeartbeatState = () => {
    // heartbeat.toState is idempotent
    this.heartbeat.toState(AppState.currentState === 'active' && this.props.hasAuth);
  };

  // React to props changes.
  //
  // Not dependent on `render()`'s return value, although the docs may not yet
  // be clear on that. See: https://github.com/reactjs/reactjs.org/pull/1230.
  componentDidUpdate() {
    this.updateHeartbeatState();
  }

  render() {
    return null;
  }
}

/** (NB this is a per-account component.) */
// TODO(#5005): either make one of these per account, or make it act on all accounts
const PresenceHeartbeat: ComponentType<OuterProps> = connect(state => ({
  hasAuth: getHasAuth(state),
}))(PresenceHeartbeatInner);

export default PresenceHeartbeat;
