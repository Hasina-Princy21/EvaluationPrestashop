import { Outlet } from 'react-router-dom';
import Menu from './components/Menu';

const FrontOffice = () => {
    return (
        <div>
            <Menu />
            <div style={{ paddingTop: '80px' }}> {/* To avoid content being hidden behind the fixed menu */}
                <Outlet />
            </div>
        </div>
    );
};

export default FrontOffice;