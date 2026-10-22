import React from 'react';
import { View } from 'react-native';
import { GlowzButton } from './GlowzButton';
import { GlowzEmptyState } from './GlowzEmptyState';

interface Props { onHome: () => void; children: React.ReactNode }
interface State { failed: boolean }

/** A crash in one screen shows a recovery state instead of taking down the feature. */
export class GlowzErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 18 }}>
        <GlowzEmptyState
          title="Something went wrong"
          subtitle="This screen could not load."
          action={
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlowzButton small label="Try again" onPress={() => this.setState({ failed: false })} />
              <GlowzButton small variant="ghost" label="Home" onPress={() => { this.setState({ failed: false }); this.props.onHome(); }} />
            </View>
          }
        />
      </View>
    );
  }
}
