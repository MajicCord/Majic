/*
 * Majic — SpotifyControls seek bar
 */

import { LazyComponent } from "@utils/lazyReact";
import { filters, find } from "@webpack";

export const SeekBar = LazyComponent(() => {
    const found = find(filters.componentByCode("markDash", "this.renderMark("), { isIndirect: true });
    const SliderClass = found?.$$typeof ? (found.type ?? found.render) : found;
    if (!SliderClass) return null;

    return class SeekBar extends SliderClass {
        static getDerivedStateFromProps(props: any, state: any) {
            const newState = SliderClass.getDerivedStateFromProps?.(props, state);
            if (newState) newState.value = props.initialValue;
            return newState;
        }
    };
});
