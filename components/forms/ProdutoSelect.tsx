import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { Produto } from "@/types";
import axios from "axios";

type ProdutoBasic = {
  id: number;
  nome: string;
  codigo_barras?: string | null;
};

interface ProdutoSelectProps {
  value: number | null;
  onChange: (produtoId: number | null, produto?: Produto) => void;
  initialProduto?: ProdutoBasic | null;  // Pre-loaded product data to avoid API fetch
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

/**
 * ProdutoSelect - Autocomplete component for product selection
 *
 * Features:
 * - Search by product name or barcode
 * - Lazy loading (only loads when user types)
 * - Shows product code when available
 * - Clearable selection
 */
export function ProdutoSelect({
  value,
  onChange,
  initialProduto = null,
  placeholder = "Buscar produto...",
  disabled = false,
  error = false,
  className = "",
}: ProdutoSelectProps) {
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoBasic | null>(initialProduto);

  // Load initial selected product if value is provided and no initialProduto
  useEffect(() => {
    if (initialProduto) {
      setSelectedProduto(initialProduto);
    } else if (value && !selectedProduto) {
      loadProdutoById(value);
    }
  }, [value, initialProduto]);

  // Load product by ID
  const loadProdutoById = async (id: number) => {
    try {
      const response = await axios.get(`/api/produtos/${id}`);
      if (response.data.success) {
        setSelectedProduto(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load product:", err);
    }
  };

  // Search products with debounce
  useEffect(() => {
    if (search.length < 2) {
      setProdutos([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/produtos", {
          params: {
            search,
            limit: 20,
            ativo: true, // Only active products
          },
        });

        if (response.data.success) {
          setProdutos(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to search products:", err);
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle product selection
  const handleSelect = (produto: Produto) => {
    setSelectedProduto(produto);
    setSearch("");
    setShowDropdown(false);
    onChange(produto.id, produto);
  };

  // Handle clear selection
  const handleClear = () => {
    setSelectedProduto(null);
    setSearch("");
    setProdutos([]);
    onChange(null);
  };

  // Display text for selected product
  const displayText = useMemo(() => {
    if (selectedProduto) {
      const parts = [selectedProduto.nome];
      if (selectedProduto.codigo_barras) {
        parts.push(`(${selectedProduto.codigo_barras})`);
      }
      return parts.join(" ");
    }
    return "";
  }, [selectedProduto]);

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>

        <input
          type="text"
          value={selectedProduto ? displayText : search}
          onChange={(e) => {
            if (!selectedProduto) {
              setSearch(e.target.value);
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (!selectedProduto) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => setShowDropdown(false), 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!!selectedProduto}
          className={`
            w-full pl-10 pr-10 py-2 border rounded-md
            ${error ? "border-red-500" : "border-gray-300"}
            ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            ${selectedProduto ? "cursor-default" : ""}
            focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
        />

        {/* Clear button */}
        {selectedProduto && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !selectedProduto && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="p-3 text-center text-gray-500">
              Carregando...
            </div>
          )}

          {!loading && search.length < 2 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              Digite ao menos 2 caracteres para buscar
            </div>
          )}

          {!loading && search.length >= 2 && produtos.length === 0 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              Nenhum produto encontrado
            </div>
          )}

          {!loading && produtos.length > 0 && (
            <ul>
              {produtos.map((produto) => (
                <li key={produto.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(produto)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <div className="font-medium text-gray-900">
                      {produto.nome}
                    </div>
                    {produto.codigo_barras && (
                      <div className="text-sm text-gray-500">
                        Código: {produto.codigo_barras}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
