import React, { useEffect, useState } from 'react';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { get, set, del, ab2str, str2ab } from '../utils/storage';
import { loadCodeFromSrc, getParams } from '../state/code';
import { loadMint, getTokensForSeries } from '../state/views';
import { getFrameMedia, uploadMedia, getMediaUrl } from '../state/app';
import { Menu } from './Menu';
import { Params } from './Params';
import { Frame } from './Page';

const PENDING_IMAGE_UPLOAD = '__PENDING_IMAGE_UPLOAD__';

export const Mint = ({ app, path, views, update, dispatch, account }) => {

	const { mintMenu, image } = app;
	const { mint: item } = views;

	const [state, setState] = useState({ args: {} });

	const seriesName = path.matchAll(/\/mint\/(.+)/gi).next()?.value[1];

	useEffect(() => {
		dispatch(loadMint(seriesName));
		checkPendingImageUpload();
	}, []);

	const checkPendingImageUpload = async () => {
		const { accountId: account_id } = account;
		const data = get(PENDING_IMAGE_UPLOAD + account.accountId);
		if (data && data.image && data.image.length) {
			/// find last token by owner
			const numTokens = await account.viewFunction(contractId, 'nft_supply_for_owner', {
				account_id,
			});
			const token = (await account.viewFunction(contractId, 'nft_tokens_for_owner', {
				account_id,
				from_index: (parseInt(numTokens, 10) - 1).toString(),
				limit: '1',
			}))[0];
			// decode and upload image
			const image = str2ab(data.image);
			const response = await uploadMedia({account, image, token});
			console.log(response);
			del(PENDING_IMAGE_UPLOAD + account.accountId);
		}
	};

	const handleImage = async () => {
		if (!image) return;
		
		// stash image in localStorage
		set(PENDING_IMAGE_UPLOAD + account.accountId, { image: ab2str(image) });
		//mint token
		try {
			const { series } = item;
			const { args } = state;
			if (series.claimed === series.params.max_supply) {
				throw 'None left of this series';
			}
			const mint = Object.values(args);
			const owner = Object.values(getParams(series.src).params.owner).map((p) => JSON.stringify(p.default));
			if (series.params.mint.length && !mint.length) {
				throw 'Choose some values to make this unique';
			}
			const tokens = await dispatch(getTokensForSeries(series.series_name));
			const exists = tokens.some(({ series_args }) => {
				// console.log(JSON.stringify(series_args.mint.sort()), JSON.stringify(mint.sort()))
				return series_args.mint.length && 
				(JSON.stringify(series_args.mint.sort()) === JSON.stringify(mint.sort()));
			});
			if (exists) {
				throw 'A token with these values exists, try another combination';
			}
			account.functionCall(marketId, 'offer', {
				nft_contract_id: contractId,
				token_id: series.series_name,
				msg: JSON.stringify({
					series_name: series.series_name,
					mint,
					owner,
					receiver_id: account.accountId,
					media: getMediaUrl(contractId)
				})
			}, GAS, parseNearAmount('1.1'));
		} catch (e) {
			console.warn(e);
			del(PENDING_IMAGE_UPLOAD + account.accountId);
			return alert(e);
		}
	};
	useEffect(handleImage, [image]);

	const handleOffer = async () => {
		dispatch(getFrameMedia(item.id)); // -> handleImage
	};

	const updateArgs = (name, value) => {
		if (!value.length) return;
		const newArgs = { ...args, [name]: value };
		setState({ args: newArgs });
		let newCode = item.series.src;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{\\s\*${k}\\s\*}}`, 'g'), v));
		dispatch(loadCodeFromSrc({
			id: item.series.series_name, src: newCode, owner_id: item.owner_id
		}));
	};

	let mintMenuOptions = {};
	const params = [];
	if (item) {

		Object.entries(getParams(item.series.src).params.mint).forEach(([k, v]) => {
			params.push({
				name: k,
				default: v.default,
				type: v.type
			});
		});

		item.series.params.enforce_unique_mint_args;


		mintMenuOptions = {
			[item.series.series_name]: {
				frag: <>
					{ item.series.params.mint.length && <>
						<div>
							Mint a variant of the series by choosing: { item.series.params.mint.join() }.
						</div>
						{ item.series.params.enforce_unique_mint_args &&
							<div>
								Mint values must be unique from other tokens minted.
							</div>
						}
					</>
					}
					
					{ item.series.params.owner.length && <>
						<div>
							Once you are an owner, you can update the following: { item.series.params.owner.join() }.
						</div>
						{ item.series.params.enforce_unique_owner_args &&
							<div>
								The owner values must be unique from other tokens.
							</div>
						}
					</>
					}

					<div>Total supply of {item.series.params.max_supply}.</div>
					<div>
						Minting asks for more than list price to pay storage of your unique arguments on chain. You will be refunded any unused NEAR.
					</div>
				</>
			}
		};
	} else {
		return null;
	}

	const { args } = state;

	return <>
		<div className="mint">
			<div className="menu no-barcode">
				<div className="bar">
					<div onClick={() => update('app.mintMenu', mintMenu === 'left' ? false : 'left')}>About</div>
					<div onClick={() => handleOffer()}>Mint</div>
				</div>
				{
					mintMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'mintMenu', update, options: mintMenuOptions
						}} />
					</div>
				}
			</div>

			<div className="gallery">
				<Frame {...{dispatch, items: [item], menu: 'onlyTop' }} />
			</div>

			<div className="mint-params">
				<Params {...{params, args, updateArgs}} />
			</div>
		</div>

	</>;
};

