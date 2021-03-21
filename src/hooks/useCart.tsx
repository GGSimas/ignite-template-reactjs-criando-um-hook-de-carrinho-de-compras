import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (productStock.amount <= 1) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      let existingProduct = cart.find(product => product.id === productId)
      let newCart: Product[] = []

      if (!existingProduct) {
        const { data } = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`)

        existingProduct = {
          ...data,
          amount: 1
        }

        newCart = [...cart, existingProduct];
        setCart(newCart)
      } else {
        newCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: product.amount + 1
        })

        setCart(newCart)
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch(err) {
      toast.error(err.message.includes('fora de estoque') ? err.message : 'Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(c => c.id === productId);

      if (!findProduct) {
        throw 'Erro na remoção do produto'
      }

      const filteredProducts = cart.filter(c => c.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredProducts));
      setCart(filteredProducts); 
    } catch (e){
      toast.error(e);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error('Quantidade inválida')
      }
    
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (productStock.amount <= 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const newCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      })
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
