    localhost/api/products

<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<product>
    <id_manufacturer><![CDATA[1]]></id_manufacturer>
    <id_supplier><![CDATA[1]]></id_supplier>
    <id_category_default><![CDATA[1]]></id_category_default>
    <new><![CDATA[1]]></new>
    <id_default_combination><![CDATA[1]]></id_default_combination>
    <id_tax_rules_group><![CDATA[1]]></id_tax_rules_group>
    <type><![CDATA[1]]></type>
    <id_shop_default><![CDATA[1]]></id_shop_default>
    <reference><![CDATA[123456]]></reference>
    <supplier_reference><![CDATA[ABCDEF]]></supplier_reference>
    <ean13><![CDATA[1231231231231]]></ean13>
    <state><![CDATA[1]]></state>
    <product_type><![CDATA[standard]]></product_type>
    <price><![CDATA[123.45]]></price>
    <unit_price><![CDATA[123.45]]></unit_price>
    <active><![CDATA[1]]></active>
    <meta_description>
        <language id="1"><![CDATA[Description]]></language>
    </meta_description>
    <meta_keywords>
        <language id="1"><![CDATA[Keywords]]></language>
    </meta_keywords>
    <meta_title>
        <language id="1"><![CDATA[My Title for SEO]]></language>
    </meta_title>
    <link_rewrite>
        <language id="1"><![CDATA[awesome-product]]></language>
    </link_rewrite>
    <name>
        <language id="1"><![CDATA[My awesome Product]]></language>
    </name>
    <description>
        <language id="1"><![CDATA[Description]]></language>
    </description>
    <description_short>
        <language id="1"><![CDATA[Short description]]></language>
    </description_short>
    <associations>
        <categories>
            <category>
                <id><![CDATA[1]]></id>
            </category>
        </categories>
    </associations>
</product>
</prestashop>

# produits avec combinaison POST
    /api/products 

<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product>
        <id_manufacturer><![CDATA[1]]></id_manufacturer>
        <id_supplier><![CDATA[1]]></id_supplier>
        <id_category_default><![CDATA[1]]></id_category_default>
        <new><![CDATA[1]]></new>
        <id_default_combination><![CDATA[1]]></id_default_combination>
        <id_tax_rules_group><![CDATA[1]]></id_tax_rules_group>
        <type><![CDATA[1]]></type>
        <id_shop_default><![CDATA[1]]></id_shop_default>
        <reference><![CDATA[123456]]></reference>
        <supplier_reference><![CDATA[ABCDEF]]></supplier_reference>
        <ean13><![CDATA[1231231231231]]></ean13>
        <state><![CDATA[1]]></state>
        <product_type><![CDATA[combinations]]></product_type>
        <price><![CDATA[123.45]]></price>
        <unit_price><![CDATA[123.45]]></unit_price>
        <active><![CDATA[1]]></active>
        <meta_description>
            <language id="1"><![CDATA[Description]]></language>
        </meta_description>
        <meta_keywords>
            <language id="1"><![CDATA[Keywords]]></language>
        </meta_keywords>
        <meta_title>
            <language id="1"><![CDATA[My Title for SEO]]></language>
        </meta_title>
        <link_rewrite>
            <language id="1"><![CDATA[awesome-product]]></language>
        </link_rewrite>
        <name>
            <language id="1"><![CDATA[My awesome Product with combinations]]></language>
        </name>
        <description>
            <language id="1"><![CDATA[Description]]></language>
        </description>
        <description_short>
            <language id="1"><![CDATA[Short description]]></language>
        </description_short>
        <associations>
            <categories>
                <category>
                    <id><![CDATA[1]]></id>
                </category>
            </categories>
        </associations>
    </product>
</prestashop>


# schema

<?xml version="1.0" encoding="UTF-8"?>
<prestashop
	xmlns:xlink="http://www.w3.org/1999/xlink">
	<product>
		<id><![CDATA[]]></id>
		<id_manufacturer><![CDATA[]]></id_manufacturer>
		<id_supplier><![CDATA[]]></id_supplier>
		<id_category_default><![CDATA[]]></id_category_default>
		<new><![CDATA[]]></new>
		<cache_default_attribute><![CDATA[]]></cache_default_attribute>
		<id_default_image><![CDATA[]]></id_default_image>
		<id_default_combination><![CDATA[]]></id_default_combination>
		<id_tax_rules_group><![CDATA[]]></id_tax_rules_group>
		<position_in_category><![CDATA[]]></position_in_category>
		<type><![CDATA[]]></type>
		<id_shop_default><![CDATA[]]></id_shop_default>
		<reference><![CDATA[]]></reference>
		<supplier_reference><![CDATA[]]></supplier_reference>
		<location><![CDATA[]]></location>
		<width><![CDATA[]]></width>
		<height><![CDATA[]]></height>
		<depth><![CDATA[]]></depth>
		<weight><![CDATA[]]></weight>
		<quantity_discount><![CDATA[]]></quantity_discount>
		<ean13><![CDATA[]]></ean13>
		<isbn><![CDATA[]]></isbn>
		<upc><![CDATA[]]></upc>
		<mpn><![CDATA[]]></mpn>
		<cache_is_pack><![CDATA[]]></cache_is_pack>
		<cache_has_attachments><![CDATA[]]></cache_has_attachments>
		<is_virtual><![CDATA[]]></is_virtual>
		<state><![CDATA[]]></state>
		<additional_delivery_times><![CDATA[]]></additional_delivery_times>
		<delivery_in_stock>
			<language id="1">
<![CDATA[]]>	</language>
		</delivery_in_stock>
		<delivery_out_stock>
			<language id="1">
<![CDATA[]]>	</language>
		</delivery_out_stock>
		<product_type><![CDATA[]]></product_type>
		<on_sale><![CDATA[]]></on_sale>
		<online_only><![CDATA[]]></online_only>
		<ecotax><![CDATA[]]></ecotax>
		<minimal_quantity><![CDATA[]]></minimal_quantity>
		<low_stock_threshold><![CDATA[]]></low_stock_threshold>
		<low_stock_alert><![CDATA[]]></low_stock_alert>
		<price><![CDATA[]]></price>
		<wholesale_price><![CDATA[]]></wholesale_price>
		<unity><![CDATA[]]></unity>
		<unit_price><![CDATA[]]></unit_price>
		<unit_price_ratio><![CDATA[]]></unit_price_ratio>
		<additional_shipping_cost><![CDATA[]]></additional_shipping_cost>
		<customizable><![CDATA[]]></customizable>
		<text_fields><![CDATA[]]></text_fields>
		<uploadable_files><![CDATA[]]></uploadable_files>
		<active><![CDATA[]]></active>
		<redirect_type><![CDATA[]]></redirect_type>
		<id_type_redirected><![CDATA[]]></id_type_redirected>
		<available_for_order><![CDATA[]]></available_for_order>
		<available_date><![CDATA[]]></available_date>
		<show_condition><![CDATA[]]></show_condition>
		<condition><![CDATA[]]></condition>
		<show_price><![CDATA[]]></show_price>
		<indexed><![CDATA[]]></indexed>
		<visibility><![CDATA[]]></visibility>
		<advanced_stock_management><![CDATA[]]></advanced_stock_management>
		<date_add><![CDATA[]]></date_add>
		<date_upd><![CDATA[]]></date_upd>
		<pack_stock_type><![CDATA[]]></pack_stock_type>
		<meta_description>
			<language id="1">
<![CDATA[]]>	</language>
		</meta_description>
		<meta_keywords>
			<language id="1">
<![CDATA[]]>	</language>
		</meta_keywords>
		<meta_title>
			<language id="1">
<![CDATA[]]>	</language>
		</meta_title>
		<link_rewrite>
			<language id="1">
<![CDATA[]]>	</language>
		</link_rewrite>
		<name>
			<language id="1">
<![CDATA[]]>	</language>
		</name>
		<description>
			<language id="1">
<![CDATA[]]>	</language>
		</description>
		<description_short>
			<language id="1">
<![CDATA[]]>	</language>
		</description_short>
		<available_now>
			<language id="1">
<![CDATA[]]>	</language>
		</available_now>
		<available_later>
			<language id="1">
<![CDATA[]]>	</language>
		</available_later>
		<associations>
			<categories>
				<category>
					<id>
		<![CDATA[]]>			</id>
				</category>
			</categories>
			<images>
				<image>
					<id>
		<![CDATA[]]>			</id>
				</image>
			</images>
			<combinations>
				<combination>
					<id>
		<![CDATA[]]>			</id>
				</combination>
			</combinations>
			<product_option_values>
				<product_option_value>
					<id>
		<![CDATA[]]>			</id>
				</product_option_value>
			</product_option_values>
			<product_features>
				<product_feature>
					<id>
		<![CDATA[]]>			</id>
					<id_feature_value>
		<![CDATA[]]>			</id_feature_value>
				</product_feature>
			</product_features>
			<tags>
				<tag>
					<id>
		<![CDATA[]]>			</id>
				</tag>
			</tags>
			<stock_availables>
				<stock_available>
					<id>
		<![CDATA[]]>			</id>
					<id_product_attribute>
		<![CDATA[]]>			</id_product_attribute>
				</stock_available>
			</stock_availables>
			<attachments>
				<attachment>
					<id>
		<![CDATA[]]>			</id>
				</attachment>
			</attachments>
			<accessories>
				<product>
					<id>
		<![CDATA[]]>			</id>
				</product>
			</accessories>
			<product_bundle>
				<product>
					<id>
		<![CDATA[]]>			</id>
					<id_product_attribute>
		<![CDATA[]]>			</id_product_attribute>
					<quantity>
		<![CDATA[]]>			</quantity>
				</product>
			</product_bundle>
		</associations>
	</product>
</prestashop>