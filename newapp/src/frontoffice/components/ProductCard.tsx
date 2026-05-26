import type { Product } from '../../api/productService';
import './ProductCard.css';
import { Link } from 'react-router-dom';

type ProductCardProps = {
    product: Product;
    onAddToCart: (product: Product) => void;
};

const apiKey = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const getProductBadge = (dateAddStr?: string): 'HOT' | 'NEW' | null => {
    if (!dateAddStr) return null;

    // Normalize PrestaShop "YYYY-MM-DD HH:MM:SS" format to ISO for cross-browser parsing
    const normalizedStr = dateAddStr.trim().replace(" ", "T");
    const dateAdd = new Date(normalizedStr);

    if (isNaN(dateAdd.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - dateAdd.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays >= 0 && diffDays <= 1) {
        return 'HOT';
    } else if (diffDays > 1 && diffDays <= 7) {
        return 'NEW';
    }

    return null;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const imageUrl = product.id_default_image
        ? `/api/images/products/${product.id}/${product.id_default_image}?ws_key=${apiKey}`
        : 'https://via.placeholder.com/150';

    const badge = getProductBadge(product.date_add);

    return (
        <div className="product-card" style={{ position: 'relative' }}>
            {badge && (
                <div className={`product-badge badge-${badge.toLowerCase()}`}>
                    {badge}
                </div>
            )}
            <Link to={`/front/product/${product.id}`}>
                <img
                    src={imageUrl}
                    alt={product.name}
                    style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    }}
                />
                <h3>{product.name}</h3>
            </Link>
            <p>Prix: {parseFloat(product.price).toFixed(2)} €</p>
            <button onClick={() => onAddToCart(product)}>Ajouter au panier</button>
        </div>
    );
};

export default ProductCard;
