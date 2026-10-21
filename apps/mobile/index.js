import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

LogBox.ignoreLogs([
  'Cannot record touch end without a touch start',
]);

registerRootComponent(App);
